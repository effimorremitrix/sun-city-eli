import { createFileRoute } from "@tanstack/react-router";

/**
 * ============================================================
 * Webhook לקליטת לידים מקמפיינים ממומנים (Meta Lead Ads).
 *
 * GET  — אימות ה-webhook מול Meta (hub.challenge), עם הטוקן שמוגדר
 *        ב-META_LEADS_VERIFY_TOKEN (אותו ערך שמזינים ב-App Dashboard).
 * POST — אירועי leadgen: לכל ליד נשלפים הפרטים מה-Graph API עם טוקן
 *        העמוד השמור (facebook_connections לפי page_id), ונוצר כרטיס
 *        ליד אצל הסוכן של אותו עמוד עם source="קמפיין" ותיעוד הקמפיין.
 *
 * דורש בהגדרת האפליקציה ב-Meta: הרשאת leads_retrieval + רישום ה-webhook
 * לאובייקט page עם השדה leadgen. בלי אלה ה-webhook פשוט לא ייקרא.
 * ============================================================
 */

type LeadgenChange = {
  field?: string;
  value?: { leadgen_id?: string; page_id?: string; ad_id?: string; form_id?: string };
};

type LeadgenEntry = { id?: string; changes?: LeadgenChange[] };

export const Route = createFileRoute("/api/meta-leads")({
  server: {
    handlers: {
      // אימות חד-פעמי של ה-webhook מול Meta
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env["META_LEADS_VERIFY_TOKEN"];
        if (mode === "subscribe" && expected && token === expected && challenge) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        // מחזירים 200 תמיד — Meta משעה webhook שמחזיר שגיאות ברצף
        const done = Response.json({ ok: true });
        try {
          const body = (await request.json().catch(() => null)) as {
            object?: string;
            entry?: LeadgenEntry[];
          } | null;
          if (!body || body.object !== "page" || !Array.isArray(body.entry)) return done;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { graphBase } = await import("@/lib/meta-graph.server");
          const { logLeadEvent, LEAD_COLUMNS } = await import("@/lib/leads.server");
          const { normalizePhone } = await import("@/lib/leads");

          for (const entry of body.entry) {
            for (const change of entry.changes ?? []) {
              if (change.field !== "leadgen") continue;
              const leadgenId = change.value?.leadgen_id;
              const pageId = change.value?.page_id ?? entry.id;
              if (!leadgenId || !pageId) continue;

              // העמוד → החיבור השמור → הסוכן המטפל (site) וטוקן העמוד
              const { data: conn } = await supabaseAdmin
                .from("facebook_connections")
                .select("site_id, page_access_token")
                .eq("page_id", pageId)
                .maybeSingle();
              if (!conn?.site_id || !conn.page_access_token) continue;

              // שליפת פרטי הליד מה-Graph API
              const res = await fetch(
                `${graphBase()}/${leadgenId}?fields=field_data,created_time,ad_id,ad_name,campaign_id,campaign_name&access_token=${encodeURIComponent(conn.page_access_token as string)}`,
              );
              if (!res.ok) {
                console.error("meta lead fetch failed", leadgenId, res.status);
                continue;
              }
              const lead = (await res.json()) as {
                field_data?: Array<{ name?: string; values?: string[] }>;
                campaign_id?: string;
                campaign_name?: string;
                ad_id?: string;
                ad_name?: string;
              };

              const fields = new Map<string, string>();
              for (const f of lead.field_data ?? []) {
                if (f.name && f.values?.[0]) fields.set(f.name.toLowerCase(), f.values[0]);
              }
              const fullName =
                fields.get("full_name") ??
                [fields.get("first_name"), fields.get("last_name")].filter(Boolean).join(" ") ??
                "ליד מקמפיין";
              const phone = fields.get("phone_number") ?? fields.get("phone") ?? null;
              const email = fields.get("email") ?? null;
              if (!fullName && !phone && !email) continue;

              const campaignNote = [
                lead.campaign_name ? `קמפיין: ${lead.campaign_name}` : null,
                lead.ad_name ? `מודעה: ${lead.ad_name}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              // דדופ בסיסי: ליד פתוח קיים עם אותו טלפון באותו site
              const phoneNormalized = normalizePhone(phone);
              if (phoneNormalized) {
                const { data: existing } = await supabaseAdmin
                  .from("leads")
                  .select(LEAD_COLUMNS)
                  .eq("site_id", conn.site_id as string)
                  .eq("phone_normalized", phoneNormalized)
                  .not("status", "in", '("נסגרה עסקה","לא רלוונטי")')
                  .limit(1)
                  .maybeSingle();
                if (existing) {
                  await logLeadEvent(supabaseAdmin, {
                    leadId: existing.id as string,
                    siteId: conn.site_id as string,
                    eventType: "contact_again",
                    note: `ליד חוזר מקמפיין ממומן${campaignNote ? ` (${campaignNote})` : ""}`,
                  });
                  continue;
                }
              }

              const { data: created, error } = await supabaseAdmin
                .from("leads")
                .insert({
                  site_id: conn.site_id as string,
                  full_name: fullName || "ליד מקמפיין",
                  phone,
                  phone_normalized: phoneNormalized || null,
                  email,
                  source: "קמפיין",
                  notes: campaignNote || null,
                  criteria_extra: {
                    meta_leadgen_id: leadgenId,
                    campaign_id: lead.campaign_id ?? null,
                    campaign_name: lead.campaign_name ?? null,
                    ad_id: lead.ad_id ?? null,
                    ad_name: lead.ad_name ?? null,
                  },
                })
                .select("id")
                .single();
              if (error) {
                console.error("meta lead insert failed", error.message);
                continue;
              }

              await logLeadEvent(supabaseAdmin, {
                leadId: created.id as string,
                siteId: conn.site_id as string,
                eventType: "created",
                note: `ליד נכנס מקמפיין ממומן${campaignNote ? ` (${campaignNote})` : ""}`,
              });
            }
          }
          return done;
        } catch (e) {
          console.error("meta-leads webhook failed", e instanceof Error ? e.message : e);
          return done;
        }
      },
    },
  },
});
