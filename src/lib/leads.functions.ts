import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CLIENT_RESPONSES,
  CLOSED_LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  isValidIsraeliPhone,
  normalizePhone,
  parseCategories,
  type ClientResponse,
  type LeadSource,
  type LeadStatus,
  type PropertyCategory,
} from "@/lib/leads";
import type { FollowUpBuckets, LeadRecord } from "@/lib/leads.server";
import { OFFICE_SLUG } from "@/lib/site-data";

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
  "id,site_id,user_id,listing_id,search_profile_id,full_name,phone,phone_normalized,email,source,status,buy_categories,sell_categories,notes,next_action,next_follow_up_at,created_at,updated_at,contact_id,utm_source,utm_campaign,referrer,landing_path,deal_type,city,neighborhoods,property_type,min_price,max_price,min_rooms,max_rooms,min_size,min_floor,max_floor,needs_mamad,needs_elevator,needs_parking,needs_balcony,listing:listing_id(id,title)";

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
  buy_categories: PropertyCategory[];
  sell_categories: PropertyCategory[];
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
      buy_categories: parseCategories(l["buy_categories"]),
      sell_categories: parseCategories(l["sell_categories"]),
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
 * שדה honeypot, מגבלות קצב במסד (IP + מכשיר), קיצוץ אורכים ורשימת מקורות
 * סגורה. הליד נקשר ללקוח (contact) ונוצר אצל הסוכן המטפל הקבוע שלו —
 * לא אצל הדף שבו במקרה נשלח הטופס. מחזירה תמיד ok — הטופס באתר לעולם לא
 * נחסם על ידי הקליטה.
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
      marketListingId?: string | null;
      website?: string | null;
      /** קריטריוני חיפוש מובנים (טופס הקונים) — עוברים סניטציה בצד השרת */
      criteria?: unknown;
      /** הסכמת דיוור (מייל/וואטסאפ) — תנאי לקבלת התראות התאמה אוטומטיות */
      marketingConsent?: boolean;
      sessionId?: string | null;
    }) => ({
      siteId: str(input?.siteId, 60),
      siteSlug: str(input?.siteSlug, 60),
      name: str(input?.name, 80),
      phone: str(input?.phone, 30),
      email: str(input?.email, 120),
      message: str(input?.message, 500),
      source: isSource(input?.source) ? input.source : ("אתר אישי" as LeadSource),
      listingId: str(input?.listingId, 60),
      marketListingId: str(input?.marketListingId, 60),
      website: str(input?.website, 200), // honeypot — אמור להישאר ריק
      criteria: input?.criteria ?? null,
      marketingConsent: input?.marketingConsent === true,
      sessionId: str(input?.sessionId, 60),
    }),
  )
  .handler(async ({ data }) => {
    try {
      // honeypot: בוטים ממלאים את השדה הנסתר — מתעלמים בשקט
      if (data.website) return { ok: true };
      if (!data.name) return { ok: true };
      if (data.phone && !isValidIsraeliPhone(data.phone)) return { ok: true };

      const { enforceLimits, perMinute } = await import("@/lib/rate-limit.server");
      const { getSettings } = await import("@/lib/settings.server");
      const settings = await getSettings();
      const limit = await enforceLimits({
        scope: "lead",
        ip: perMinute(settings.leads_per_minute, "leads"),
        device: perMinute(settings.leads_per_minute, "leads"),
      });
      if (!limit.allowed) return { ok: true };

      const { ingestLead, sanitizeLeadCriteria, upsertSearchProfileFromCriteria } =
        await import("@/lib/leads.server");
      const { resolveContact } = await import("@/lib/contacts.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const criteria = sanitizeLeadCriteria(data.criteria);

      // הדף שבו נשלח הטופס — משמש לשיוך רק כשללקוח אין עדיין סוכן
      let pageSiteId: string | null = null;
      if (data.siteId) {
        const { data: s } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("id", data.siteId)
          .eq("is_active", true)
          .maybeSingle();
        pageSiteId = (s?.id as string | undefined) ?? null;
      }
      if (!pageSiteId && data.siteSlug) {
        const { data: s } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("slug", data.siteSlug)
          .eq("is_active", true)
          .maybeSingle();
        pageSiteId = (s?.id as string | undefined) ?? null;
      }

      const { getOptionalUserId } = await import("@/lib/optional-auth.server");
      const userId = await getOptionalUserId();

      const { contact, attribution } = await resolveContact({
        phone: data.phone,
        email: data.email,
        fullName: data.name,
        userId,
        source: data.source,
        pageSiteId,
        marketingConsent: data.marketingConsent,
      });

      // לקוח מחובר עם דרישות חיפוש: הדרישות נשמרות גם כפרופיל חיפוש מאוחד
      let searchProfileId: string | null = null;
      if (criteria && userId) {
        searchProfileId = await upsertSearchProfileFromCriteria(supabaseAdmin, {
          userId,
          contactId: contact.id,
          criteria,
          whatsappPhone: data.phone,
          notes: data.message,
        });
      }

      let sessionHash: string | null = null;
      if (data.sessionId) {
        try {
          const { createHash } = await import("node:crypto");
          const salt = process.env["ANALYTICS_SALT"] || "sun-city-analytics";
          sessionHash = createHash("sha256")
            .update(`${salt}:${data.sessionId}`)
            .digest("hex")
            .slice(0, 32);
        } catch {
          sessionHash = null;
        }
      }

      const marketNote = data.marketListingId
        ? await marketListingNote(data.marketListingId)
        : null;

      await ingestLead({
        contact,
        fullName: data.name,
        phone: data.phone,
        email: data.email,
        userId,
        source: data.source,
        listingId: data.listingId,
        marketListingId: data.marketListingId,
        searchProfileId,
        message: [data.message, marketNote].filter(Boolean).join("\n") || null,
        criteria,
        marketingConsent: data.marketingConsent,
        attribution,
        sessionHash,
        ...(data.marketListingId
          ? { criteriaExtra: { market_listing_id: data.marketListingId } }
          : {}),
      });

      // פנייה על נכס ("מעניין אותי" / "רוצה שסוכן יחזור אליי") — התראה מיידית לסוכן
      if (data.listingId || data.marketListingId) {
        try {
          const { handleClientAction, LEAD_COLUMNS } = await import("@/lib/leads.server");
          const { data: leadRow } = await supabaseAdmin
            .from("leads")
            .select(LEAD_COLUMNS)
            .eq("contact_id", contact.id)
            .not("status", "in", closedList())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const target = await resolveTarget(data.listingId, data.marketListingId);
          if (leadRow && target) {
            await handleClientAction({
              kind: data.source === "התעניינות בנכס" ? "interest" : "callback",
              responseLabel:
                data.source === "התעניינות בנכס" ? "מעניין אותי" : "רוצה שסוכן יחזור אליי",
              userId,
              contact,
              lead: leadRow as never,
              target,
              siteUrl: (await getSettings()).site_url,
            });
          }
        } catch (e) {
          console.error("lead agent alert failed", e instanceof Error ? e.message : e);
        }
      }
      return { ok: true };
    } catch (e) {
      // קליטת ליד היא Best-effort — כשל כאן לעולם לא שובר את חוויית הגולש
      console.error("createPublicLead failed", e instanceof Error ? e.message : e);
      return { ok: true };
    }
  });

/** שורת תיאור למודעה מהשוק — נכנסת להערות הליד כדי שהסוכן יראה את המקור */
async function marketListingNote(marketListingId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("market_listings")
      .select("title, source_site, source_url")
      .eq("id", marketListingId)
      .maybeSingle();
    if (!m) return null;
    return `נכס מהשוק (${m.source_site ?? "לוח"}): ${m.title} — ${m.source_url}`;
  } catch {
    return null;
  }
}

/** יעד הפעולה (נכס משרד או מודעה מהשוק) לצורך התראה לסוכן */
async function resolveTarget(
  listingId: string | null,
  marketListingId: string | null,
): Promise<{
  listingId: string | null;
  marketListingId: string | null;
  title: string;
  siteId: string | null;
  sourceUrl?: string | null;
} | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (listingId) {
    const { data: l } = await supabaseAdmin
      .from("listings")
      .select("id, title, site_id")
      .eq("id", listingId)
      .maybeSingle();
    if (!l) return null;
    return {
      listingId: l.id as string,
      marketListingId: null,
      title: l.title as string,
      siteId: (l.site_id as string | null) ?? null,
    };
  }
  if (marketListingId) {
    const { data: m } = await supabaseAdmin
      .from("market_listings")
      .select("id, title, source_url, source_site")
      .eq("id", marketListingId)
      .maybeSingle();
    if (!m) return null;
    return {
      listingId: null,
      marketListingId: m.id as string,
      title: `${m.title} (${m.source_site ?? "מהשוק"})`,
      siteId: null,
      sourceUrl: m.source_url as string,
    };
  }
  return null;
}

/**
 * לקוח מחובר מבקש חזרה / מסמן עניין על מודעה מהשוק (אין שורת listing_feedback
 * כי הטבלה מצביעה על listings בלבד) — ליד אצל הסוכן המטפל + התראה.
 */
export const requestMarketCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { marketListingId: string; kind?: "callback" | "interest" }) => ({
    marketListingId: String(input?.marketListingId ?? ""),
    kind: input?.kind === "interest" ? ("interest" as const) : ("callback" as const),
  }))
  .handler(async ({ data, context }) => {
    const { enforceLimits, perMinute } = await import("@/lib/rate-limit.server");
    const { getSettings } = await import("@/lib/settings.server");
    const settings = await getSettings();
    const limit = await enforceLimits({
      scope: "feedback",
      userId: context.userId,
      user: perMinute(settings.feedback_per_minute, "feedback"),
    });
    if (!limit.allowed) throw new Error("יותר מדי פעולות. נסו שוב בעוד רגע");

    const target = await resolveTarget(null, data.marketListingId);
    if (!target) throw new Error("הנכס אינו זמין");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findOrCreateLeadForUser, handleClientAction } = await import("@/lib/leads.server");
    const { officeSiteId } = await import("@/lib/contacts.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const office = await officeSiteId();
    const { lead, contact } = await findOrCreateLeadForUser(office ?? "", context.userId, {
      fullName: (profile?.full_name as string | null) ?? null,
      email: (profile?.email as string | null) ?? null,
      source: "הסוכן האישי",
      marketListingId: data.marketListingId,
      createdNote: `הלקוח התעניין בנכס מהשוק: ${target.title}`,
    });
    const label = data.kind === "callback" ? "רוצה שסוכן יחזור אליי" : "מעניין אותי";
    await handleClientAction({
      kind: data.kind,
      responseLabel: label,
      userId: context.userId,
      contact,
      lead,
      target,
      siteUrl: settings.site_url,
    });
    return { ok: true };
  });

/** העברת ליד (והלקוח שלו) לסוכן אחר — מנהל ראשי בלבד */
export const adminReassignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; toSiteId: string }) => ({
    leadId: String(input?.leadId ?? ""),
    toSiteId: String(input?.toSiteId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, site_id, contact_id")
      .eq("id", data.leadId)
      .maybeSingle();
    if (!lead) throw new Error("הליד לא נמצא");
    const { data: site } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("id", data.toSiteId)
      .maybeSingle();
    if (!site) throw new Error("הדף לא נמצא");
    if (lead.contact_id) {
      const { reassignContact } = await import("@/lib/contacts.server");
      return reassignContact(lead.contact_id as string, data.toSiteId, context.userId);
    }
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ site_id: data.toSiteId, reassigned_from_site_id: lead.site_id })
      .eq("id", lead.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("lead_events")
      .update({ site_id: data.toSiteId })
      .eq("lead_id", lead.id);
    await supabaseAdmin.from("lead_events").insert({
      lead_id: lead.id,
      site_id: data.toSiteId,
      event_type: "note",
      note: "הליד הועבר לסוכן אחר על ידי המנהל",
      metadata: { from_site_id: lead.site_id, to_site_id: data.toSiteId },
      actor_user_id: context.userId,
    });
    return { movedLeads: 1 };
  });

export type ContactCard = {
  contact: {
    id: string;
    full_name: string | null;
    phone_normalized: string | null;
    email: string | null;
    user_id: string | null;
    assigned_site_id: string | null;
    assigned_at: string | null;
    first_source: string | null;
    first_site_id: string | null;
    first_utm_source: string | null;
    first_utm_campaign: string | null;
    first_utm_content: string | null;
    first_referrer: string | null;
    first_landing_path: string | null;
    marketing_consent: boolean;
    created_at: string;
  };
  leads: Array<{
    id: string;
    site_id: string;
    source: string;
    status: string;
    created_at: string;
    listing_id: string | null;
    next_follow_up_at: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    referrer: string | null;
    landing_path: string | null;
  }>;
  profiles: Array<{
    id: string;
    label: string;
    deal_type: string;
    neighborhoods: string[];
    min_price: number | null;
    max_price: number | null;
    min_rooms: number | null;
    rooms: number | null;
    max_rooms: number | null;
    is_active: boolean;
    created_at: string;
  }>;
  activity: Array<{
    id: number;
    kind: string;
    event: string;
    status: string;
    channel: string | null;
    message: string | null;
    error: string | null;
    created_at: string;
    listing_id: string | null;
    market_listing_id: string | null;
  }>;
  sites: Array<{ id: string; name: string; slug: string }>;
};

/** כרטיס הלקוח המלא: כל הלידים, הפרופילים, המשוב וההתראות של אותו אדם */
export const adminGetContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contactId: string }) => ({ contactId: String(input?.contactId ?? "") }))
  .handler(async ({ data, context }): Promise<ContactCard> => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    // RLS: can_view_contact — מנהל רואה רק לקוחות עם ליד/פרופיל אצלו
    const { data: contact, error } = await context.supabase
      .from("contacts")
      .select("*")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contact) throw new Error("הלקוח לא נמצא");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: leads }, { data: profiles }, { data: activity }, { data: sites }] =
      await Promise.all([
        supabaseAdmin
          .from("leads")
          .select(
            "id, site_id, source, status, created_at, listing_id, next_follow_up_at, utm_source, utm_campaign, referrer, landing_path",
          )
          .eq("contact_id", data.contactId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("search_profiles")
          .select(
            "id, label, deal_type, neighborhoods, min_price, max_price, min_rooms, rooms, max_rooms, is_active, created_at",
          )
          .eq("contact_id", data.contactId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("activity_log")
          .select(
            "id, kind, event, status, channel, message, error, created_at, listing_id, market_listing_id",
          )
          .eq("contact_id", data.contactId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabaseAdmin.from("sites").select("id, name, slug"),
      ]);
    return {
      contact: contact as unknown as ContactCard["contact"],
      leads: (leads ?? []) as ContactCard["leads"],
      profiles: (profiles ?? []) as ContactCard["profiles"],
      activity: (activity ?? []) as ContactCard["activity"],
      sites: (sites ?? []) as ContactCard["sites"],
    };
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
      .select(
        "id, user_id, response, search_profile_id, listing:listing_id(id, title, site_id), market:market_listing_id(id, title, source_url, source_site)",
      )
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
    const market = notification.market as unknown as {
      id: string;
      title: string;
      source_url: string;
      source_site: string | null;
    } | null;
    if (!listing && !market) throw new Error("הנכס אינו זמין");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findOrCreateLeadForUser, handleClientAction } = await import("@/lib/leads.server");
    const { officeSiteId } = await import("@/lib/contacts.server");
    const { getSettings } = await import("@/lib/settings.server");

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

    const pageSite = listing?.site_id ?? (await officeSiteId()) ?? "";
    const { lead, contact } = await findOrCreateLeadForUser(pageSite, context.userId, {
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      phone: (searchProfile as { whatsapp_phone?: string | null } | null)?.whatsapp_phone ?? null,
      source: "הסוכן האישי",
      listingId: listing?.id ?? null,
      marketListingId: market?.id ?? null,
      searchProfileId: notification.search_profile_id,
      createdNote: "ליד נוצר אוטומטית — הלקוח הגיב להתראת נכס",
    });

    const responseLabel = CLIENT_RESPONSES[data.response];
    const { error: stampError } = await supabaseAdmin
      .from("listing_notifications")
      .update({
        response: data.response,
        response_at: new Date().toISOString(),
        lead_id: lead.id,
        contact_id: contact.id,
        read_at: new Date().toISOString(),
      })
      .eq("id", notification.id);
    if (stampError) throw new Error(stampError.message);

    await handleClientAction({
      kind: data.response === "talk_to_me" ? "callback" : "response",
      responseLabel,
      userId: context.userId,
      contact,
      lead,
      target: listing
        ? {
            listingId: listing.id,
            marketListingId: null,
            title: listing.title,
            siteId: listing.site_id,
          }
        : {
            listingId: null,
            marketListingId: market!.id,
            title: `${market!.title} (${market!.source_site ?? "מהשוק"})`,
            siteId: null,
            sourceUrl: market!.source_url,
          },
      siteUrl: (await getSettings()).site_url,
      metadata: { response: data.response, notification_id: notification.id },
    });

    return { ok: true };
  });
