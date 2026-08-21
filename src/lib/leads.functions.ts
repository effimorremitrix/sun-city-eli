import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CLIENT_RESPONSES,
  CLOSED_LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  isValidIsraeliPhone,
  normalizePhone,
  type ClientResponse,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads";
import type { FollowUpBuckets, LeadRecord } from "@/lib/leads.server";

/** שורת ליד כפי שמוצגת ב-UI — כולל כותרת הנכס הקשור */
export type LeadRow = LeadRecord & {
  listing: { id: string; title: string } | null;
};

export type LeadEventRow = {
  id: string;
  event_type: string;
  note: string | null;
  listing_id: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  actor_user_id: string | null;
  created_at: string;
};

export type LeadsDashboardCounts = {
  newLeads: number;
  followUpsToday: number;
  overdue: number;
  tours: number;
  negotiation: number;
  deals: number;
};

const LEAD_ROW_COLUMNS =
  "id,site_id,user_id,listing_id,search_profile_id,full_name,phone,phone_normalized,email,source,status,notes,next_action,next_follow_up_at,created_at,updated_at,listing:listing_id(id,title)";

const str = (v: unknown, max = 200): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

const isStatus = (v: unknown): v is LeadStatus =>
  typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);

const isSource = (v: unknown): v is LeadSource =>
  typeof v === "string" && (LEAD_SOURCES as readonly string[]).includes(v);

/** ISO תקין או null — מגן מפני ערכי תאריך שרירותיים מהקליינט */
const isoOrNull = (v: unknown): string | null => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const closedList = () =>
  `(${(CLOSED_LEAD_STATUSES as readonly string[]).map((s) => `"${s}"`).join(",")})`;

/** רשימת הלידים של אתר (סוכן), עם סינון סטטוס וחיפוש חופשי */
export const adminListLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; status?: string | null; q?: string | null }) => ({
    siteId: String(input?.siteId ?? ""),
    status: isStatus(input?.status) ? input.status : null,
    q: str(input?.q, 80),
  }))
  .handler(async ({ data, context }): Promise<LeadRow[]> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);

    let q = context.supabase.from("leads").select(LEAD_ROW_COLUMNS).eq("site_id", data.siteId);
    if (data.status) q = q.eq("status", data.status);
    if (data.q) {
      const term = data.q.replace(/[%_,()"']/g, "");
      if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data: rows, error } = await q.order("updated_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as LeadRow[];
  });

/** כרטיס ליד מלא כולל ציר הזמן */
export const adminGetLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; leadId: string }) => ({
    siteId: String(input?.siteId ?? ""),
    leadId: String(input?.leadId ?? ""),
  }))
  .handler(async ({ data, context }): Promise<{ lead: LeadRow; events: LeadEventRow[] }> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);

    const [{ data: lead, error }, { data: events, error: evError }] = await Promise.all([
      context.supabase
        .from("leads")
        .select(LEAD_ROW_COLUMNS)
        .eq("site_id", data.siteId)
        .eq("id", data.leadId)
        .single(),
      context.supabase
        .from("lead_events")
        .select("id,event_type,note,listing_id,metadata,actor_user_id,created_at")
        .eq("lead_id", data.leadId)
        .eq("site_id", data.siteId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (error) throw new Error(error.message);
    if (evError) throw new Error(evError.message);
    return {
      lead: lead as unknown as LeadRow,
      events: (events ?? []) as unknown as LeadEventRow[],
    };
  });

export type LeadInput = {
  id?: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  listing_id: string | null;
  notes: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
};

function parseLeadInput(input: unknown): { siteId: string; lead: LeadInput } {
  const i = (input ?? {}) as Record<string, unknown>;
  const l = (i["lead"] ?? {}) as Record<string, unknown>;
  const phone = str(l["phone"], 30);
  if (phone && !isValidIsraeliPhone(phone)) {
    throw new Error("נא להזין מספר טלפון ישראלי תקין");
  }
  const fullName = str(l["full_name"], 80);
  if (!fullName) throw new Error("נא להזין שם");
  return {
    siteId: String(i["siteId"] ?? ""),
    lead: {
      id: str(l["id"], 60),
      full_name: fullName,
      phone,
      email: str(l["email"], 120),
      source: isSource(l["source"]) ? l["source"] : "ידני",
      status: isStatus(l["status"]) ? l["status"] : "ליד חדש",
      listing_id: str(l["listing_id"], 60),
      notes: str(l["notes"], 2000),
      next_action: str(l["next_action"], 300),
      next_follow_up_at: isoOrNull(l["next_follow_up_at"]),
    },
  };
}

/** יצירה או עדכון של כרטיס ליד מתוך אזור הניהול */
export const adminSaveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseLeadInput(input))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { applyLeadUpdate, logLeadEvent, LEAD_COLUMNS } = await import("@/lib/leads.server");

    const { id, ...fields } = data.lead;
    const phone_normalized = normalizePhone(fields.phone) || null;

    if (id) {
      const { data: existing, error } = await context.supabase
        .from("leads")
        .select(LEAD_COLUMNS)
        .eq("site_id", data.siteId)
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      await applyLeadUpdate(context.supabase, context.userId, existing, {
        ...fields,
        phone_normalized,
      });
      return { ok: true, id };
    }

    const { data: row, error } = await context.supabase
      .from("leads")
      .insert({
        ...fields,
        phone_normalized,
        site_id: data.siteId,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logLeadEvent(context.supabase, {
      leadId: row.id as string,
      siteId: data.siteId,
      eventType: "created",
      note: `ליד נוצר ידנית (מקור: ${fields.source})`,
      listingId: fields.listing_id,
      actorUserId: context.userId,
    });
    return { ok: true, id: row.id as string };
  });

/** מחיקת ליד (ציר הזמן נמחק יחד איתו) */
export const adminDeleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; leadId: string }) => ({
    siteId: String(input?.siteId ?? ""),
    leadId: String(input?.leadId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { error } = await context.supabase
      .from("leads")
      .delete()
      .eq("site_id", data.siteId)
      .eq("id", data.leadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const QUICK_ACTIONS = {
  call: { event: "call", note: "התקשרתי ללקוח" },
  whatsapp: { event: "whatsapp", note: "שלחתי הודעת WhatsApp" },
  property_sent: { event: "property_sent", note: "שלחתי נכס ללקוח" },
  tour_scheduled: { event: "tour_scheduled", note: "קבעתי סיור" },
  tour_done: { event: "tour_done", note: "בוצע סיור" },
  follow_up_set: { event: "follow_up_set", note: "נקבע Follow-up" },
  follow_up_done: { event: "follow_up_done", note: "Follow-up בוצע" },
} as const;
export type QuickActionKey = keyof typeof QUICK_ACTIONS;

/**
 * פעולה מהירה מכרטיס הליד — רושמת אירוע בציר הזמן ומחילה את תופעות הלוואי:
 * סטטוס (סיור נקבע/בוצע, יצירת קשר ראשונה) ומועד ה-Follow-up הבא.
 */
export const adminLeadQuickAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      siteId: string;
      leadId: string;
      action: string;
      note?: string | null;
      listingId?: string | null;
      followUpAt?: string | null;
    }) => {
      const action = String(input?.action ?? "");
      if (!(action in QUICK_ACTIONS)) throw new Error("פעולה לא מוכרת");
      return {
        siteId: String(input?.siteId ?? ""),
        leadId: String(input?.leadId ?? ""),
        action: action as QuickActionKey,
        note: str(input?.note, 300),
        listingId: str(input?.listingId, 60),
        followUpAt: isoOrNull(input?.followUpAt),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { applyLeadUpdate, logLeadEvent, LEAD_COLUMNS } = await import("@/lib/leads.server");

    const { data: existing, error } = await context.supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .eq("site_id", data.siteId)
      .eq("id", data.leadId)
      .single();
    if (error) throw new Error(error.message);

    const patch: Record<string, unknown> = {};

    if (data.action === "follow_up_set") {
      if (!data.followUpAt) throw new Error("נא לבחור מועד ל-Follow-up");
      patch["next_follow_up_at"] = data.followUpAt;
      if (data.note) patch["next_action"] = data.note;
      // אירוע follow_up_set נרשם אוטומטית בתוך applyLeadUpdate
      await applyLeadUpdate(context.supabase, context.userId, existing, patch);
      return { ok: true };
    }

    if (data.action === "follow_up_done") {
      // ניקוי המשימה (או החלפתה במועד הבא אם נמסר) + אירוע ביצוע
      patch["next_follow_up_at"] = data.followUpAt;
      patch["next_action"] = data.followUpAt ? (data.note ?? existing.next_action) : null;
      await logLeadEvent(context.supabase, {
        leadId: existing.id,
        siteId: existing.site_id,
        eventType: "follow_up_done",
        note: `Follow-up בוצע${existing.next_action ? ` — ${existing.next_action}` : ""}${data.note ? ` (${data.note})` : ""}`,
        actorUserId: context.userId,
      });
      await applyLeadUpdate(context.supabase, context.userId, existing, patch);
      return { ok: true };
    }

    // פעולות תיעוד: התקשרתי / WhatsApp / שלחתי נכס / סיור נקבע / סיור בוצע
    const spec = QUICK_ACTIONS[data.action];
    let listingTitle: string | null = null;
    if (data.listingId) {
      const { data: listing } = await context.supabase
        .from("listings")
        .select("title")
        .eq("id", data.listingId)
        .maybeSingle();
      listingTitle = (listing?.title as string | undefined) ?? null;
    }
    await logLeadEvent(context.supabase, {
      leadId: existing.id,
      siteId: existing.site_id,
      eventType: spec.event,
      note: `${spec.note}${listingTitle ? `: ${listingTitle}` : ""}${data.note ? ` — ${data.note}` : ""}`,
      listingId: data.listingId,
      actorUserId: context.userId,
    });

    if (data.action === "tour_scheduled") patch["status"] = "נקבע סיור";
    if (data.action === "tour_done") patch["status"] = "בוצע סיור";
    if ((data.action === "call" || data.action === "whatsapp") && existing.status === "ליד חדש") {
      patch["status"] = "נוצר קשר";
    }
    if (data.followUpAt) {
      patch["next_follow_up_at"] = data.followUpAt;
      if (data.action === "tour_scheduled") patch["next_action"] = "סיור בנכס";
    }
    if (Object.keys(patch).length) {
      await applyLeadUpdate(context.supabase, context.userId, existing, patch);
    }
    return { ok: true };
  });

/** מסך "המשימות שלי": לידים פתוחים מחולקים לדליים לפי מועד ה-Follow-up */
export const adminListFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => ({ siteId: String(input?.siteId ?? "") }))
  .handler(async ({ data, context }): Promise<FollowUpBuckets<LeadRow>> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { bucketFollowUps } = await import("@/lib/leads.server");

    const { data: rows, error } = await context.supabase
      .from("leads")
      .select(LEAD_ROW_COLUMNS)
      .eq("site_id", data.siteId)
      .not("status", "in", closedList())
      .limit(500);
    if (error) throw new Error(error.message);
    return bucketFollowUps((rows ?? []) as unknown as LeadRow[]);
  });

/**
 * Dashboard ניהולי: ספירות לפי סטטוס ומועדי Follow-up.
 * עם siteId — נתוני אתר בודד (לכל מנהל של האתר); בלעדיו — כלל הצוות (אדמין בלבד),
 * כולל פירוט לפי סוכן.
 */
export const adminLeadsDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId?: string | null }) => ({ siteId: str(input?.siteId, 60) }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      total: LeadsDashboardCounts;
      perSite: Array<{ siteId: string; name: string; counts: LeadsDashboardCounts }>;
    }> => {
      const { assertManager, assertSiteAccess } = await import("@/lib/admin.server");
      const { bucketFollowUps } = await import("@/lib/leads.server");
      const access = await assertManager(context);
      if (data.siteId) await assertSiteAccess(context, data.siteId);
      else if (!access.isAdmin) throw new Error("Forbidden");

      let q = context.supabase.from("leads").select("site_id,status,next_follow_up_at");
      if (data.siteId) q = q.eq("site_id", data.siteId);
      const { data: rows, error } = await q.limit(5000);
      if (error) throw new Error(error.message);

      type Slim = { site_id: string; status: string; next_follow_up_at: string | null };
      const all = (rows ?? []) as Slim[];

      const countsFor = (leads: Slim[]): LeadsDashboardCounts => {
        const buckets = bucketFollowUps(leads);
        return {
          newLeads: leads.filter((l) => l.status === "ליד חדש").length,
          followUpsToday: buckets.today.length,
          overdue: buckets.overdue.length,
          tours: leads.filter((l) => l.status === "נקבע סיור").length,
          negotiation: leads.filter((l) => l.status === 'מו"מ').length,
          deals: leads.filter((l) => l.status === "נסגרה עסקה").length,
        };
      };

      const perSite = access.sites
        .filter((s) => !data.siteId || s.id === data.siteId)
        .map((s) => ({
          siteId: s.id,
          name: s.name,
          counts: countsFor(all.filter((l) => l.site_id === s.id)),
        }))
        .filter((s) => Object.values(s.counts).some((n) => n > 0) || Boolean(data.siteId));

      return { total: countsFor(all), perSite };
    },
  );

/** מונה תשומת-הלב לתגית הטאב: משימות באיחור + לידים חדשים שטרם טופלו */
export const adminLeadsAttentionCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);

    const nowIso = new Date().toISOString();
    // RLS מגביל אוטומטית לאתרים של המשתמש (אדמין רואה את כולם)
    const [{ count: overdue, error: e1 }, { count: untouched, error: e2 }] = await Promise.all([
      context.supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .not("status", "in", closedList())
        .lt("next_follow_up_at", nowIso),
      context.supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "ליד חדש")
        .is("next_follow_up_at", null),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    return { count: (overdue ?? 0) + (untouched ?? 0) };
  });

// ---- קליטת לידים מהאתר הציבורי ----

/**
 * קליטת ליד מטופס ציבורי (ללא התחברות). הכתיבה ב-service role; הגנות:
 * שדה honeypot, מגבלת קצב לפי IP, קיצוץ אורכים ורשימת מקורות סגורה.
 * מחזירה תמיד ok — הטופס באתר לעולם לא נחסם על ידי הקליטה.
 */
export const createPublicLead = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      siteId?: string | null;
      siteSlug?: string | null;
      name: string;
      phone?: string | null;
      email?: string | null;
      message?: string | null;
      source: string;
      listingId?: string | null;
      website?: string | null;
    }) => ({
      siteId: str(input?.siteId, 60),
      siteSlug: str(input?.siteSlug, 60),
      name: str(input?.name, 80),
      phone: str(input?.phone, 30),
      email: str(input?.email, 120),
      message: str(input?.message, 500),
      source: isSource(input?.source) ? input.source : ("אתר אישי" as LeadSource),
      listingId: str(input?.listingId, 60),
      website: str(input?.website, 200), // honeypot — אמור להישאר ריק
    }),
  )
  .handler(async ({ data }) => {
    try {
      // honeypot: בוטים ממלאים את השדה הנסתר — מתעלמים בשקט
      if (data.website) return { ok: true };
      if (!data.name) return { ok: true };
      if (data.phone && !isValidIsraeliPhone(data.phone)) return { ok: true };

      const { getRequest } = await import("@tanstack/react-start/server");
      const ip = getRequest()?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const { checkPublicLeadRateLimit, logLeadEvent, LEAD_COLUMNS } =
        await import("@/lib/leads.server");
      if (!checkPublicLeadRateLimit(ip)) return { ok: true };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // זיהוי האתר (הסוכן המטפל): לפי id, אחרת לפי slug, אחרת אתר המשרד הראשי
      let site: { id: string } | null = null;
      if (data.siteId) {
        const { data: s } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("id", data.siteId)
          .eq("is_active", true)
          .maybeSingle();
        site = s ?? null;
      }
      if (!site && data.siteSlug) {
        const { data: s } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("slug", data.siteSlug)
          .eq("is_active", true)
          .maybeSingle();
        site = s ?? null;
      }
      if (!site) {
        const { data: s } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("slug", "sun-city")
          .maybeSingle();
        site = s ?? null;
      }
      if (!site) return { ok: true };

      const { getOptionalUserId } = await import("@/lib/optional-auth.server");
      const userId = await getOptionalUserId();

      const phoneNormalized = normalizePhone(data.phone);

      // דדופ: פנייה חוזרת מאותו טלפון לאותו אתר מתועדת על הליד הפתוח הקיים
      if (phoneNormalized) {
        const { data: existing } = await supabaseAdmin
          .from("leads")
          .select(LEAD_COLUMNS)
          .eq("site_id", site.id)
          .eq("phone_normalized", phoneNormalized)
          .not("status", "in", closedList())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          await logLeadEvent(supabaseAdmin, {
            leadId: existing.id as string,
            siteId: site.id,
            eventType: "contact_again",
            note: `פנייה חוזרת מהאתר (${data.source})${data.message ? `: ${data.message}` : ""}`,
            listingId: data.listingId,
          });
          // נגיעה קלה בשורת הליד כדי שיעלה לראש הרשימה (הטריגר מעדכן updated_at)
          await supabaseAdmin
            .from("leads")
            .update({ listing_id: data.listingId ?? existing.listing_id })
            .eq("id", existing.id);
          return { ok: true };
        }
      }

      const { data: lead, error } = await supabaseAdmin
        .from("leads")
        .insert({
          site_id: site.id,
          user_id: userId,
          listing_id: data.listingId,
          full_name: data.name,
          phone: data.phone,
          phone_normalized: phoneNormalized || null,
          email: data.email,
          source: data.source,
          notes: data.message,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await logLeadEvent(supabaseAdmin, {
        leadId: lead.id as string,
        siteId: site.id,
        eventType: "created",
        note: `ליד נכנס מהאתר (${data.source})${data.message ? `: ${data.message}` : ""}`,
        listingId: data.listingId,
      });
      return { ok: true };
    } catch (e) {
      // קליטת ליד היא Best-effort — כשל כאן לעולם לא שובר את חוויית הגולש
      console.error("createPublicLead failed", e instanceof Error ? e.message : e);
      return { ok: true };
    }
  });

// ---- תגובת לקוח על התראת נכס (הסוכן האישי) ----

/**
 * הלקוח מגיב על התראת נכס: "מעניין אותי" / "רוצה לראות" / "דברו איתי".
 * יוצר/מעדכן כרטיס ליד אצל הסוכן המטפל, רושם אירוע בציר הזמן, קובע
 * משימת Follow-up אוטומטית ומעדכן את ההתראה עצמה.
 */
export const respondToNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notificationId: string; response: string }) => {
    const response = String(input?.response ?? "");
    if (!(response in CLIENT_RESPONSES)) throw new Error("תגובה לא מוכרת");
    return {
      notificationId: String(input?.notificationId ?? ""),
      response: response as ClientResponse,
    };
  })
  .handler(async ({ data, context }) => {
    // ההתראה נטענת עם קליינט המשתמש — כך מובטח שהיא באמת שלו (RLS)
    const { data: notification, error } = await context.supabase
      .from("listing_notifications")
      .select("id, user_id, response, search_profile_id, listing:listing_id(id, title, site_id)")
      .eq("id", data.notificationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!notification) throw new Error("ההתראה לא נמצאה");
    if (notification.response) return { ok: true, already: true };

    const listing = notification.listing as unknown as {
      id: string;
      title: string;
      site_id: string | null;
    } | null;
    if (!listing?.site_id) throw new Error("הנכס אינו זמין");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      findOrCreateLeadForUser,
      applyLeadUpdate,
      logLeadEvent,
      tomorrowAt10Israel,
      notifyAgentOfClientResponse,
    } = await import("@/lib/leads.server");

    const [{ data: profile }, { data: searchProfile }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name, email").eq("id", context.userId).single(),
      notification.search_profile_id
        ? supabaseAdmin
            .from("search_profiles")
            .select("whatsapp_phone")
            .eq("id", notification.search_profile_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const { lead } = await findOrCreateLeadForUser(listing.site_id, context.userId, {
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      phone: (searchProfile as { whatsapp_phone?: string | null } | null)?.whatsapp_phone ?? null,
      source: "הסוכן האישי",
      listingId: listing.id,
      searchProfileId: notification.search_profile_id,
      createdNote: "ליד נוצר אוטומטית — הלקוח הגיב להתראת נכס",
    });

    const responseLabel = CLIENT_RESPONSES[data.response];
    await logLeadEvent(supabaseAdmin, {
      leadId: lead.id,
      siteId: listing.site_id,
      eventType: "client_response",
      note: `הלקוח סימן "${responseLabel}" על הנכס: ${listing.title}`,
      listingId: listing.id,
      metadata: { response: data.response, notification_id: notification.id },
    });

    // משימת Follow-up אוטומטית לסוכן — מחר ב-10:00, אלא אם כבר נקבע מועד קרוב יותר
    const followUpAt = tomorrowAt10Israel();
    if (!lead.next_follow_up_at || lead.next_follow_up_at > followUpAt) {
      await applyLeadUpdate(supabaseAdmin, null, lead, {
        next_follow_up_at: followUpAt,
        next_action: `לחזור ללקוח — הגיב "${responseLabel}" על: ${listing.title}`,
      });
    }

    const { error: stampError } = await supabaseAdmin
      .from("listing_notifications")
      .update({
        response: data.response,
        response_at: new Date().toISOString(),
        lead_id: lead.id,
        read_at: new Date().toISOString(),
      })
      .eq("id", notification.id);
    if (stampError) throw new Error(stampError.message);

    // עדכון הסוכן במייל — Best-effort, לא מפיל את התגובה
    try {
      await notifyAgentOfClientResponse(lead, listing.site_id, listing.title, responseLabel);
    } catch (e) {
      console.error("notifyAgentOfClientResponse failed", e instanceof Error ? e.message : e);
    }

    return { ok: true };
  });
