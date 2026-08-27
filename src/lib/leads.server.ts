import {
  CLOSED_LEAD_STATUSES,
  normalizePhone,
  type LeadEventType,
  type LeadStatus,
} from "@/lib/leads";
import { neighborhoods as canonical, canonicalNeighborhood } from "@/lib/neighborhoods";

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
  "id,site_id,user_id,listing_id,search_profile_id,full_name,phone,phone_normalized,email,source,status,buy_categories,sell_categories,notes,next_action,next_follow_up_at,created_at,updated_at,deal_type,city,neighborhoods,property_type,min_price,max_price,min_rooms,max_rooms,min_size,min_floor,max_floor,needs_mamad,needs_elevator,needs_parking,needs_balcony";

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
 * איתור ליד פתוח קיים ללקוח רשום באתר נתון — ואם אין, יצירת כרטיס חדש
 * (עם אירוע 'created'). service role בלבד: משמש את הזרימות האוטומטיות
 * (התאמות הסוכן האישי, תגובות לקוח) שבהן הכותב אינו הסוכן.
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
    searchProfileId?: string | null;
    createdNote?: string | null;
  },
): Promise<{ lead: LeadRecord; created: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const closed = [...CLOSED_LEAD_STATUSES] as string[];

  const { data: byUser, error: findErr } = await supabaseAdmin
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .not("status", "in", `(${closed.map((s) => `"${s}"`).join(",")})`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (byUser) return { lead: byUser as unknown as LeadRecord, created: false };

  const phoneNormalized = normalizePhone(seed.phone);
  if (phoneNormalized) {
    const { data: byPhone, error: phoneErr } = await supabaseAdmin
      .from("leads")
      .select(LEAD_COLUMNS)
      .eq("site_id", siteId)
      .eq("phone_normalized", phoneNormalized)
      .not("status", "in", `(${closed.map((s) => `"${s}"`).join(",")})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (phoneErr) throw new Error(phoneErr.message);
    if (byPhone) {
      const lead = byPhone as unknown as LeadRecord;
      // ליד שנקלט בעבר בלי חשבון — משלימים את הקישור ללקוח הרשום
      if (!lead.user_id) {
        await supabaseAdmin.from("leads").update({ user_id: userId }).eq("id", lead.id);
        lead.user_id = userId;
      }
      return { lead, created: false };
    }
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("leads")
    .insert({
      site_id: siteId,
      user_id: userId,
      listing_id: seed.listingId ?? null,
      search_profile_id: seed.searchProfileId ?? null,
      full_name: seed.fullName?.trim() || "לקוח רשום",
      phone: seed.phone ?? null,
      phone_normalized: phoneNormalized || null,
      email: seed.email ?? null,
      source: seed.source,
    })
    .select(LEAD_COLUMNS)
    .single();
  if (insErr) throw new Error(insErr.message);

  const lead = inserted as unknown as LeadRecord;
  await logLeadEvent(supabaseAdmin, {
    leadId: lead.id,
    siteId,
    eventType: "created",
    note: seed.createdNote ?? `ליד נוצר אוטומטית (מקור: ${seed.source})`,
    listingId: seed.listingId ?? null,
  });
  return { lead, created: true };
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

// ---- הגנת קצב לקליטת לידים ציבורית ----

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 5;
const rateHits = new Map<string, number[]>();

/**
 * מגבלת קצב פשוטה לפי IP לטופסי הלידים הציבוריים — Best-effort לכל מופע שרת
 * (אין תלות חיצונית; מספיק נגד הצפה תמימה, בהתאמה לרמת ההגנות בפרויקט).
 */
export function checkPublicLeadRateLimit(ip: string, now: number = Date.now()): boolean {
  const hits = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX_PER_WINDOW) {
    rateHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateHits.set(ip, hits);
  if (rateHits.size > 5000) rateHits.clear(); // בלם זיכרון גס
  return true;
}

/** מייל לסוכן המטפל (בעל האתר) כשלקוח מגיב על התראת נכס */
export async function notifyAgentOfClientResponse(
  lead: LeadRecord,
  siteId: string,
  listingTitle: string,
  responseLabel: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendNotificationEmail } = await import("@/lib/email.server");

  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("owner_id")
    .eq("id", siteId)
    .maybeSingle();
  const ownerId = site?.owner_id as string | undefined;
  if (!ownerId) return;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", ownerId)
    .maybeSingle();
  const email = (profile?.email as string | null) ?? null;
  if (!email) return;

  const html = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#FAF8F5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <p style="color:#E8A33D;font-weight:700;margin:0">לקוח הגיב על נכס</p>
    <h1 style="color:#1B2A41;font-size:20px;margin:8px 0 4px">${lead.full_name}</h1>
    <p style="color:#333;margin:0">סימן/ה: <strong>"${responseLabel}"</strong> על הנכס: ${listingTitle}</p>
    <p style="color:#555;margin:8px 0 0">${lead.phone ?? ""}${lead.email ? ` · ${lead.email}` : ""}</p>
    <p style="color:#1B2A41;font-weight:700;margin:16px 0 0">נקבעה משימת Follow-up בכרטיס הליד — היכנסו לאזור הניהול, טאב "לידים".</p>
  </div></body></html>`;

  await sendNotificationEmail({
    to: email,
    subject: `לקוח הגיב "${responseLabel}" על הנכס: ${listingTitle}`,
    html,
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
    criteria: LeadCriteria;
    whatsappPhone?: string | null;
    notes?: string | null;
  },
): Promise<string | null> {
  try {
    const label = "נכס לפי דרישה";
    const fields = {
      user_id: input.userId,
      label,
      deal_type: input.criteria.deal_type ?? "קנייה",
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
