import {
  CLOSED_LEAD_STATUSES,
  normalizePhone,
  type LeadEventType,
  type LeadStatus,
} from "@/lib/leads";
import { neighborhoods as canonical, canonicalNeighborhood } from "@/lib/neighborhoods";
import type { ContactRecord } from "@/lib/contacts.server";
import type { Attribution } from "@/lib/request-context.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- קליינט Supabase (של המשתמש או service role)
type Db = any;

export type LeadRecord = {
  id: string;
  site_id: string;
  user_id: string | null;
  listing_id: string | null;
  search_profile_id: string | null;
  full_name: string;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  source: string;
  status: string;
  buy_categories: string[];
  sell_categories: string[];
  notes: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  contact_id: string | null;
  marketing_consent?: boolean;
  utm_source?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
} & LeadCriteria;

/**
 * קריטריוני החיפוש המובנים של ליד — אותם שדות כמו search_profiles, בסגנון
 * הפילטרים של יד2. deal_type הוא כוונת הלקוח: 'קנייה' / 'השכרה' / 'מכירה'.
 */
export type LeadCriteria = {
  deal_type: string | null;
  city: string | null;
  neighborhoods: string[];
  property_type: string | null;
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  max_rooms: number | null;
  min_size: number | null;
  min_floor: number | null;
  max_floor: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
};

export const LEAD_CRITERIA_COLUMNS =
  "deal_type,city,neighborhoods,property_type,min_price,max_price,min_rooms,max_rooms,min_size,min_floor,max_floor,needs_mamad,needs_elevator,needs_parking,needs_balcony";

// מחרוזת אחת (לא שרשור) — כדי שמנתח הטיפוסים של postgrest יזהה את העמודות
export const LEAD_COLUMNS =
  "id,site_id,user_id,listing_id,search_profile_id,full_name,phone,phone_normalized,email,source,status,buy_categories,sell_categories,notes,next_action,next_follow_up_at,created_at,updated_at,contact_id,marketing_consent,utm_source,utm_campaign,referrer,landing_path,deal_type,city,neighborhoods,property_type,min_price,max_price,min_rooms,max_rooms,min_size,min_floor,max_floor,needs_mamad,needs_elevator,needs_parking,needs_balcony";

/** כוונות עסקה חוקיות על ליד/פרופיל (כולל 'קנייה' — כוונת קונה) */
export const LEAD_DEAL_TYPES = ["קנייה", "מכירה", "השכרה"] as const;

/**
 * סניטציה של קריטריונים שהגיעו מטופס ציבורי: מספרים חיוביים בלבד, שכונות
 * רק מהרשימה הקנונית (כולל תרגום ערכים ישנים), ותקרות אורך שמרניות.
 * מחזיר null כשאין אף קריטריון ממשי — כדי לא לדרוס נתונים קיימים בכלום.
 */
export function sanitizeLeadCriteria(input: unknown): LeadCriteria | null {
  if (input == null || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const posNum = (v: unknown, max: number): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 && n <= max ? n : null;
  };
  const bool = (v: unknown) => v === true;
  const text = (v: unknown, max: number): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s.slice(0, max) : null;
  };

  const dealRaw = text(raw["deal_type"], 20);
  const deal = (LEAD_DEAL_TYPES as readonly string[]).includes(dealRaw ?? "") ? dealRaw : null;

  const hoods = Array.isArray(raw["neighborhoods"])
    ? (raw["neighborhoods"] as unknown[])
        .map((h) => (typeof h === "string" ? canonicalNeighborhood(h.trim()) : ""))
        .filter((h) => canonical.includes(h))
        .slice(0, 20)
    : [];

  const criteria: LeadCriteria = {
    deal_type: deal,
    city: text(raw["city"], 80),
    neighborhoods: [...new Set(hoods)],
    property_type: text(raw["property_type"], 60),
    min_price: posNum(raw["min_price"], 1_000_000_000),
    max_price: posNum(raw["max_price"], 1_000_000_000),
    min_rooms: posNum(raw["min_rooms"], 20),
    max_rooms: posNum(raw["max_rooms"], 20),
    min_size: posNum(raw["min_size"], 10_000),
    min_floor: posNum(raw["min_floor"], 100),
    max_floor: posNum(raw["max_floor"], 100),
    needs_mamad: bool(raw["needs_mamad"]),
    needs_elevator: bool(raw["needs_elevator"]),
    needs_parking: bool(raw["needs_parking"]),
    needs_balcony: bool(raw["needs_balcony"]),
  };

  const hasAny =
    criteria.deal_type != null ||
    criteria.neighborhoods.length > 0 ||
    criteria.property_type != null ||
    criteria.min_price != null ||
    criteria.max_price != null ||
    criteria.min_rooms != null ||
    criteria.max_rooms != null ||
    criteria.min_size != null ||
    criteria.min_floor != null ||
    criteria.max_floor != null ||
    criteria.needs_mamad ||
    criteria.needs_elevator ||
    criteria.needs_parking ||
    criteria.needs_balcony;
  return hasAny ? criteria : null;
}

/** רישום אירוע בציר הזמן של ליד — נקודת הכניסה היחידה לכתיבת lead_events */
export async function logLeadEvent(
  db: Db,
  event: {
    leadId: string;
    siteId: string;
    eventType: LeadEventType;
    note?: string | null;
    listingId?: string | null;
    metadata?: Record<string, unknown>;
    actorUserId?: string | null;
  },
) {
  const { error } = await db.from("lead_events").insert({
    lead_id: event.leadId,
    site_id: event.siteId,
    event_type: event.eventType,
    note: event.note ?? null,
    listing_id: event.listingId ?? null,
    metadata: event.metadata ?? {},
    actor_user_id: event.actorUserId ?? null,
  });
  if (error) throw new Error(error.message);
}

export type LeadPatch = Partial<{
  full_name: string;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  source: string;
  status: string;
  buy_categories: string[];
  sell_categories: string[];
  notes: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  listing_id: string | null;
  user_id: string | null;
  search_profile_id: string | null;
  contact_id: string | null;
  marketing_consent: boolean;
  consent_at: string | null;
}>;

/**
 * נקודת החנק היחידה לעדכון ליד: כותבת את העדכון ומייצרת אוטומטית את אירועי
 * ציר הזמן הנגזרים — שינוי סטטוס ו/או קביעת Follow-up חדש. שינוי מועד
 * ה-Follow-up מאפס את חותמות ה-Outbox של התזכורות (שטרם נשלחות בפועל).
 */
export async function applyLeadUpdate(
  db: Db,
  actorUserId: string | null,
  existing: LeadRecord,
  patch: LeadPatch,
  opts: { skipFollowUpEvent?: boolean } = {},
) {
  const payload: Record<string, unknown> = { ...patch };

  const statusChanged = patch.status !== undefined && patch.status !== existing.status;
  const followUpChanged =
    patch.next_follow_up_at !== undefined && patch.next_follow_up_at !== existing.next_follow_up_at;

  if (followUpChanged) {
    payload["reminder_email_sent_at"] = null;
    payload["reminder_whatsapp_sent_at"] = null;
  }

  const { error } = await db.from("leads").update(payload).eq("id", existing.id);
  if (error) throw new Error(error.message);

  if (statusChanged) {
    await logLeadEvent(db, {
      leadId: existing.id,
      siteId: existing.site_id,
      eventType: "status_change",
      note: `סטטוס עודכן: ${existing.status} ← ${patch.status}`,
      metadata: { from_status: existing.status, to_status: patch.status },
      actorUserId,
    });
  }

  if (followUpChanged && patch.next_follow_up_at && !opts.skipFollowUpEvent) {
    const when = new Date(patch.next_follow_up_at).toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      dateStyle: "short",
      timeStyle: "short",
    });
    const action = patch.next_action ?? existing.next_action;
    await logLeadEvent(db, {
      leadId: existing.id,
      siteId: existing.site_id,
      eventType: "follow_up_set",
      note: `נקבע Follow-up ל-${when}${action ? ` — ${action}` : ""}`,
      metadata: { next_follow_up_at: patch.next_follow_up_at },
      actorUserId,
    });
  }
}

/**
 * ============================================================
 * נקודת הכניסה היחידה ליצירת/עדכון ליד מכל מקור: טופס ציבורי, אזור אישי,
 * webhook של קמפיין, התאמת הסוכן החכם. תמיד דרך contact: ליד פתוח אחד
 * ללקוח, אצל הסוכן המטפל שלו (ולא אצל הדף שבו במקרה נשלח הטופס).
 * ============================================================
 */
export type IngestLeadInput = {
  contact: ContactRecord;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
  source: string;
  listingId?: string | null;
  marketListingId?: string | null;
  searchProfileId?: string | null;
  message?: string | null;
  criteria?: LeadCriteria | null;
  criteriaExtra?: Record<string, unknown> | null;
  marketingConsent?: boolean;
  attribution?: Attribution | null;
  sessionHash?: string | null;
  createdNote?: string | null;
  contactAgainNote?: string | null;
};

export async function ingestLead(
  input: IngestLeadInput,
): Promise<{ lead: LeadRecord; created: boolean; siteId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { officeSiteId } = await import("@/lib/contacts.server");
  const { logActivity } = await import("@/lib/activity.server");

  const siteId = input.contact.assigned_site_id ?? (await officeSiteId());
  if (!siteId) throw new Error("לא נמצא אתר לשיוך הליד");
  const closed = [...CLOSED_LEAD_STATUSES] as string[];
  const phoneNormalized = normalizePhone(input.phone) || input.contact.phone_normalized || null;

  const { data: existing, error: findErr } = await supabaseAdmin
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("contact_id", input.contact.id)
    .not("status", "in", `(${closed.map((s) => `"${s}"`).join(",")})`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const lead = existing as unknown as LeadRecord;
    const patch: Record<string, unknown> = {};
    if (input.listingId) patch["listing_id"] = input.listingId;
    if (input.criteria) Object.assign(patch, input.criteria);
    if (input.criteriaExtra) patch["criteria_extra"] = input.criteriaExtra;
    if (!lead.user_id && input.userId) patch["user_id"] = input.userId;
    if (!lead.search_profile_id && input.searchProfileId)
      patch["search_profile_id"] = input.searchProfileId;
    if (!lead.phone && input.phone) {
      patch["phone"] = input.phone;
      patch["phone_normalized"] = phoneNormalized;
    }
    if (!lead.email && input.email) patch["email"] = input.email;
    if (input.marketingConsent && !lead.marketing_consent) {
      patch["marketing_consent"] = true;
      patch["consent_at"] = new Date().toISOString();
    }
    // ליד שנשאר אצל סוכן אחר מהמטפל הקבוע (למשל לפני המעבר ל-contacts) — לא מזיזים
    // אוטומטית; המנהל מעביר. אבל נגיעה קלה מעלה אותו לראש הרשימה.
    const { error: updErr } = await supabaseAdmin
      .from("leads")
      .update(patch as never)
      .eq("id", lead.id);
    if (updErr) console.error("ingestLead update failed", updErr.message);
    await logLeadEvent(supabaseAdmin, {
      leadId: lead.id,
      siteId: lead.site_id,
      eventType: "contact_again",
      note:
        input.contactAgainNote ??
        `פנייה חוזרת (${input.source})${input.message ? `: ${input.message}` : ""}`,
      listingId: input.listingId ?? null,
      metadata: input.marketListingId ? { market_listing_id: input.marketListingId } : {},
    });
    await logActivity({
      kind: "client",
      event: "lead_contact_again",
      siteId: lead.site_id,
      contactId: input.contact.id,
      leadId: lead.id,
      listingId: input.listingId ?? null,
      marketListingId: input.marketListingId ?? null,
      message: `פנייה חוזרת מ-${lead.full_name} (${input.source})`,
    });
    return {
      lead: { ...lead, ...(patch as Partial<LeadRecord>) },
      created: false,
      siteId: lead.site_id,
    };
  }

  const a = input.attribution ?? null;
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("leads")
    .insert({
      site_id: siteId,
      contact_id: input.contact.id,
      user_id: input.userId ?? input.contact.user_id ?? null,
      listing_id: input.listingId ?? null,
      search_profile_id: input.searchProfileId ?? null,
      full_name: (input.fullName ?? input.contact.full_name ?? "").trim() || "לקוח",
      phone: input.phone ?? null,
      phone_normalized: phoneNormalized,
      email: input.email ?? input.contact.email ?? null,
      source: input.source,
      notes: input.message ?? null,
      ...(input.criteria ?? {}),
      ...(input.criteriaExtra ? { criteria_extra: input.criteriaExtra as never } : {}),
      ...(input.marketingConsent || input.contact.marketing_consent
        ? {
            marketing_consent: true,
            consent_at: input.contact.consent_at ?? new Date().toISOString(),
          }
        : {}),
      utm_source: a?.utmSource ?? input.contact.first_utm_source ?? null,
      utm_campaign: a?.utmCampaign ?? input.contact.first_utm_campaign ?? null,
      utm_content: a?.utmContent ?? input.contact.first_utm_content ?? null,
      referrer: a?.referrer ?? input.contact.first_referrer ?? null,
      landing_path: a?.landingPath ?? input.contact.first_landing_path ?? null,
      session_hash: input.sessionHash ?? null,
    })
    .select(LEAD_COLUMNS)
    .single();
  if (insErr) {
    // מרוץ: שתי פניות באותה שנייה — הראשונה ניצחה, מצרפים אליה
    if (insErr.code === "23505") return ingestLead(input);
    throw new Error(insErr.message);
  }
  const lead = inserted as unknown as LeadRecord;
  await logLeadEvent(supabaseAdmin, {
    leadId: lead.id,
    siteId,
    eventType: "created",
    note:
      input.createdNote ?? `ליד נכנס (${input.source})${input.message ? `: ${input.message}` : ""}`,
    listingId: input.listingId ?? null,
    metadata: input.marketListingId ? { market_listing_id: input.marketListingId } : {},
  });
  await logActivity({
    kind: "client",
    event: "lead_created",
    siteId,
    contactId: input.contact.id,
    leadId: lead.id,
    listingId: input.listingId ?? null,
    marketListingId: input.marketListingId ?? null,
    message: `ליד חדש: ${lead.full_name} (${input.source})`,
    metadata: { source: input.source, utm_source: lead.utm_source ?? null },
  });
  return { lead, created: true, siteId };
}

/**
 * איתור/יצירת ליד ללקוח רשום. siteId הוא הדף שבו התרחשה הפעולה ומשמש רק
 * לשיוך ראשוני כשללקוח אין עדיין סוכן מטפל; אחרת הליד נמצא אצל הסוכן שלו.
 */
export async function findOrCreateLeadForUser(
  siteId: string,
  userId: string,
  seed: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    source: string;
    listingId?: string | null;
    marketListingId?: string | null;
    searchProfileId?: string | null;
    createdNote?: string | null;
  },
): Promise<{ lead: LeadRecord; created: boolean; contact: ContactRecord }> {
  const { resolveContact } = await import("@/lib/contacts.server");
  const { contact, attribution } = await resolveContact({
    userId,
    phone: seed.phone ?? null,
    email: seed.email ?? null,
    fullName: seed.fullName ?? null,
    source: seed.source,
    pageSiteId: siteId,
  });
  const result = await ingestLead({
    contact,
    userId,
    fullName: seed.fullName ?? null,
    phone: seed.phone ?? null,
    email: seed.email ?? null,
    source: seed.source,
    listingId: seed.listingId ?? null,
    marketListingId: seed.marketListingId ?? null,
    searchProfileId: seed.searchProfileId ?? null,
    createdNote: seed.createdNote ?? null,
    contactAgainNote: seed.createdNote ?? null,
    attribution,
  });
  return { ...result, contact };
}

/** תקציר קריטריוני החיפוש של הלקוח בשורה אחת — להתראת הסוכן */
export function criteriaSummary(
  c: Partial<LeadCriteria> & { rooms?: number | null; label?: string | null },
): string | null {
  const parts: string[] = [];
  if (c.deal_type) parts.push(c.deal_type === "מכירה" ? "מוכר/ת נכס" : c.deal_type);
  if (c.neighborhoods?.length) parts.push(c.neighborhoods.slice(0, 4).join(", "));
  if (c.min_price != null || c.max_price != null) {
    const f = (n: number) => `${n.toLocaleString("he-IL")} ₪`;
    if (c.min_price != null && c.max_price != null)
      parts.push(`${f(c.min_price)}–${f(c.max_price)}`);
    else if (c.max_price != null) parts.push(`עד ${f(c.max_price)}`);
    else if (c.min_price != null) parts.push(`מ-${f(c.min_price)}`);
  }
  if (c.rooms != null) parts.push(`${c.rooms} חדרים`);
  else if (c.min_rooms != null || c.max_rooms != null) {
    parts.push(
      c.min_rooms != null && c.max_rooms != null
        ? `${c.min_rooms}–${c.max_rooms} חדרים`
        : c.min_rooms != null
          ? `${c.min_rooms}+ חדרים`
          : `עד ${c.max_rooms} חדרים`,
    );
  }
  if (c.min_size != null) parts.push(`${c.min_size}+ מ"ר`);
  const needs = [
    c.needs_mamad ? 'ממ"ד' : null,
    c.needs_elevator ? "מעלית" : null,
    c.needs_parking ? "חניה" : null,
    c.needs_balcony ? "מרפסת" : null,
  ].filter(Boolean);
  if (needs.length) parts.push(needs.join("/"));
  return parts.length ? parts.join(" · ") : null;
}

/** הקריטריונים העדכניים של הלקוח: הפרופיל הפעיל שלו, ואם אין — הליד */
export async function contactCriteriaSummary(
  contactId: string | null,
  lead: LeadRecord | null,
): Promise<string | null> {
  if (contactId) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("search_profiles")
        .select(
          "label, deal_type, neighborhoods, min_price, max_price, min_rooms, rooms, max_rooms, min_size, needs_mamad, needs_elevator, needs_parking, needs_balcony",
        )
        .eq("contact_id", contactId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (profile) {
        const summary = criteriaSummary({
          ...(profile as unknown as LeadCriteria),
          rooms: (profile as { rooms?: number | null }).rooms ?? null,
          city: null,
          property_type: null,
          min_floor: null,
          max_floor: null,
        });
        if (summary) return summary;
      }
    } catch {
      // נופלים לקריטריוני הליד
    }
  }
  return lead ? criteriaSummary(lead) : null;
}

export type ClientActionKind = "callback" | "interest" | "response";

/**
 * פעולת לקוח על נכס (מהאזור האישי / מהתראה / מדף ציבורי): ליד אצל הסוכן
 * המטפל, אירוע בציר הזמן, Follow-up אוטומטי, והתראה מיידית לסוכן.
 */
export async function handleClientAction(input: {
  kind: ClientActionKind;
  responseLabel: string;
  userId: string | null;
  contact: ContactRecord;
  lead: LeadRecord;
  target: {
    listingId: string | null;
    marketListingId: string | null;
    title: string;
    siteId: string | null;
    sourceUrl?: string | null;
  };
  siteUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { notifyAgent } = await import("@/lib/notify.server");
  const { logActivity } = await import("@/lib/activity.server");
  const { lead, target } = input;

  await logLeadEvent(supabaseAdmin, {
    leadId: lead.id,
    siteId: lead.site_id,
    eventType: "client_response",
    note: `הלקוח סימן "${input.responseLabel}" על הנכס: ${target.title}`,
    listingId: target.listingId,
    actorUserId: input.userId,
    metadata: {
      ...(input.metadata ?? {}),
      market_listing_id: target.marketListingId,
      kind: input.kind,
    },
  });
  await logActivity({
    kind: "client",
    event:
      input.kind === "callback"
        ? "callback_requested"
        : input.kind === "interest"
          ? "interest"
          : "notification_response",
    siteId: lead.site_id,
    contactId: input.contact.id,
    leadId: lead.id,
    listingId: target.listingId,
    marketListingId: target.marketListingId,
    actorUserId: input.userId,
    message: `${lead.full_name}: "${input.responseLabel}" על ${target.title}`,
  });

  if (input.kind === "callback" || input.kind === "response") {
    const followUpAt = tomorrowAt10Israel();
    if (!lead.next_follow_up_at || lead.next_follow_up_at > followUpAt) {
      await applyLeadUpdate(supabaseAdmin, null, lead, {
        listing_id: target.listingId ?? lead.listing_id,
        next_follow_up_at: followUpAt,
        next_action: `לחזור ללקוח — "${input.responseLabel}" על: ${target.title}`,
      });
    }
  }

  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("slug")
    .eq("id", lead.site_id)
    .maybeSingle();
  const slug = (site?.slug as string | null) ?? null;
  const listingUrl = target.listingId
    ? `${input.siteUrl}/${slug ?? ""}?listing=${target.listingId}#properties`.replace("//?", "/?")
    : `${input.siteUrl}/?market=${target.marketListingId}#properties`;

  const criteria = await contactCriteriaSummary(input.contact.id, lead);
  try {
    return await notifyAgent({
      kind: input.kind,
      responseLabel: input.responseLabel,
      siteId: lead.site_id,
      contactId: input.contact.id,
      leadId: lead.id,
      clientName: lead.full_name,
      clientPhone:
        lead.phone ??
        (input.contact.phone_normalized ? `0${input.contact.phone_normalized.slice(3)}` : null),
      clientEmail: lead.email ?? input.contact.email,
      listing: {
        id: target.listingId,
        marketId: target.marketListingId,
        title: target.title,
        url: listingUrl,
        sourceUrl: target.sourceUrl ?? null,
      },
      criteriaSummary: criteria,
      siteUrl: input.siteUrl,
    });
  } catch (e) {
    console.error("notifyAgent failed", e instanceof Error ? e.message : e);
    return { agentNotified: false };
  }
}

/**
 * חיבור הסוכן האישי למודול הלידים: אחרי שנכס פורסם והתאמות נכתבו
 * ל-listing_notifications, כל לקוח רשום שהותאם מקבל כרטיס ליד (אם אין לו)
 * ואירוע 'match' בציר הזמן. אידמפוטנטי — פרסום חוזר לא מכפיל אירועים.
 */
export async function syncListingMatchesToLeads(
  listingId: string,
  siteId: string | null,
  listingTitle: string,
) {
  if (!siteId) return { synced: 0 };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("listing_notifications")
    .select(
      "id, user_id, search_profile_id, profiles:user_id(full_name, email), search_profiles:search_profile_id(label, whatsapp_phone)",
    )
    .eq("listing_id", listingId);
  if (error) throw new Error(error.message);
  if (!rows?.length) return { synced: 0 };

  // לקוח אחד יכול להיות מותאם דרך כמה פרופילי חיפוש — כרטיס ואירוע אחד לכל לקוח
  const byUser = new Map<
    string,
    {
      full_name: string | null;
      email: string | null;
      whatsapp_phone: string | null;
      search_profile_id: string | null;
    }
  >();
  for (const row of rows as unknown as Array<{
    user_id: string;
    search_profile_id: string | null;
    profiles: { full_name: string | null; email: string | null } | null;
    search_profiles: { label: string; whatsapp_phone: string | null } | null;
  }>) {
    if (!byUser.has(row.user_id)) {
      byUser.set(row.user_id, {
        full_name: row.profiles?.full_name ?? null,
        email: row.profiles?.email ?? null,
        whatsapp_phone: row.search_profiles?.whatsapp_phone ?? null,
        search_profile_id: row.search_profile_id,
      });
    }
  }

  let synced = 0;
  for (const [userId, info] of byUser) {
    const { lead } = await findOrCreateLeadForUser(siteId, userId, {
      fullName: info.full_name,
      email: info.email,
      phone: info.whatsapp_phone,
      source: "הסוכן האישי",
      listingId,
      searchProfileId: info.search_profile_id,
      createdNote: "ליד נוצר אוטומטית — הסוכן האישי התאים נכס ללקוח רשום",
    });

    const { data: existingEvent, error: evErr } = await supabaseAdmin
      .from("lead_events")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("listing_id", listingId)
      .eq("event_type", "match")
      .limit(1)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (existingEvent) continue;

    await logLeadEvent(supabaseAdmin, {
      leadId: lead.id,
      siteId,
      eventType: "match",
      note: `הסוכן החכם התאים נכס: ${listingTitle}`,
      listingId,
      metadata: { search_profile_id: info.search_profile_id },
    });
    synced += 1;
  }
  return { synced };
}

/**
 * תאימות לאחור: התראה לסוכן על תגובת לקוח — עוברת דרך notifyAgent
 * (מייל + וואטסאפ + עותק מנהל + רישום ביומן).
 */
export async function notifyAgentOfClientResponse(
  lead: LeadRecord,
  siteId: string,
  listingTitle: string,
  responseLabel: string,
  siteUrl = "https://sun-city-eli.lovable.app",
) {
  const { notifyAgent } = await import("@/lib/notify.server");
  return notifyAgent({
    kind: "response",
    responseLabel,
    siteId,
    contactId: lead.contact_id,
    leadId: lead.id,
    clientName: lead.full_name,
    clientPhone: lead.phone,
    clientEmail: lead.email,
    listing: lead.listing_id
      ? {
          id: lead.listing_id,
          marketId: null,
          title: listingTitle,
          url: `${siteUrl}/?listing=${lead.listing_id}#properties`,
        }
      : null,
    criteriaSummary: criteriaSummary(lead),
    siteUrl,
  });
}

// ---- חישובי זמן ישראל (בלי ספריות תאריכים — Intl בלבד) ----

/** מפתח יום מקומי בישראל בפורמט YYYY-MM-DD */
export const israelDayKey = (d: Date): string =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/** מחר בשעה 10:00 שעון ישראל, כ-ISO — ברירת המחדל למשימת Follow-up אוטומטית */
export function tomorrowAt10Israel(now: Date = new Date()): string {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const day = israelDayKey(tomorrow);
  // ההיסט הנוכחי של ישראל (IST/IDT) — סטייה של שעה סביב מעבר שעון היא זניחה כאן
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    timeZoneName: "longOffset",
  })
    .formatToParts(tomorrow)
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = offsetPart?.replace("GMT", "") || "+02:00";
  return new Date(`${day}T10:00:00${offset}`).toISOString();
}

export type FollowUpBuckets<T> = {
  overdue: T[];
  today: T[];
  tomorrow: T[];
  thisWeek: T[];
  untouched: T[];
};

/**
 * חלוקת לידים פתוחים לדליי המסך "המשימות שלי", לפי שעון ישראל:
 * באיחור (המועד עבר) / להיום / מחר / השבוע (7 ימים) / לידים חדשים שטרם טופלו.
 */
export function bucketFollowUps<T extends { status: string; next_follow_up_at: string | null }>(
  rows: T[],
  now: Date = new Date(),
): FollowUpBuckets<T> {
  const buckets: FollowUpBuckets<T> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    untouched: [],
  };
  const todayKey = israelDayKey(now);
  const tomorrowKey = israelDayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const weekEnd = now.getTime() + 7 * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    if ((CLOSED_LEAD_STATUSES as readonly string[]).includes(row.status)) continue;
    if (!row.next_follow_up_at) {
      if (row.status === ("ליד חדש" satisfies LeadStatus)) buckets.untouched.push(row);
      continue;
    }
    const at = new Date(row.next_follow_up_at);
    const key = israelDayKey(at);
    if (at.getTime() < now.getTime()) buckets.overdue.push(row);
    else if (key === todayKey) buckets.today.push(row);
    else if (key === tomorrowKey) buckets.tomorrow.push(row);
    else if (at.getTime() <= weekEnd) buckets.thisWeek.push(row);
  }

  const byTime = (a: T, b: T) =>
    new Date(a.next_follow_up_at ?? 0).getTime() - new Date(b.next_follow_up_at ?? 0).getTime();
  buckets.overdue.sort(byTime);
  buckets.today.sort(byTime);
  buckets.tomorrow.sort(byTime);
  buckets.thisWeek.sort(byTime);
  return buckets;
}

/**
 * פרופיל חיפוש מאוחד: כשלקוח *מחובר* ממלא "נכס לפי דרישה", הדרישות שלו
 * נשמרות גם כ-search_profiles — אותו פרופיל שמזין את הסוכן האישי, את
 * ההתראות ואת האזור האישי. פרופיל קיים באותו label מתעדכן במקום להיווצר
 * כפול. מחזיר את מזהה הפרופיל, או null בכשל (best-effort).
 */
export async function upsertSearchProfileFromCriteria(
  db: Db,
  input: {
    userId: string;
    contactId?: string | null;
    criteria: LeadCriteria;
    whatsappPhone?: string | null;
    notes?: string | null;
  },
): Promise<string | null> {
  try {
    const label = "נכס לפי דרישה";
    const dealType =
      input.criteria.deal_type === "השכרה"
        ? "השכרה"
        : input.criteria.deal_type === "מכירה"
          ? null
          : "קנייה";
    // מוכר/ת נכס אינו פרופיל חיפוש — אין מה לנטר עבורו
    if (!dealType) return null;
    const fields = {
      user_id: input.userId,
      ...(input.contactId ? { contact_id: input.contactId } : {}),
      label,
      deal_type: dealType,
      city: input.criteria.city ?? "נתניה",
      neighborhoods: input.criteria.neighborhoods,
      min_price: input.criteria.min_price,
      max_price: input.criteria.max_price,
      min_rooms: input.criteria.min_rooms,
      max_rooms: input.criteria.max_rooms,
      min_size: input.criteria.min_size,
      needs_mamad: input.criteria.needs_mamad,
      needs_elevator: input.criteria.needs_elevator,
      needs_parking: input.criteria.needs_parking,
      needs_balcony: input.criteria.needs_balcony,
      notes: input.notes ?? null,
      notify_email: true,
      ...(input.whatsappPhone
        ? { notify_whatsapp: true, whatsapp_phone: input.whatsappPhone }
        : {}),
      is_active: true,
    };

    const { data: existing } = await db
      .from("search_profiles")
      .select("id")
      .eq("user_id", input.userId)
      .eq("label", label)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await db.from("search_profiles").update(fields).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return existing.id as string;
    }

    const { data: created, error } = await db
      .from("search_profiles")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return created.id as string;
  } catch (e) {
    console.error("upsertSearchProfileFromCriteria failed", e instanceof Error ? e.message : e);
    return null;
  }
}
