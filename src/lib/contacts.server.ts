import { normalizePhone } from "@/lib/leads";
import { OFFICE_SLUG } from "@/lib/site-data";
import {
  attributionFromRequest,
  sourceLabel,
  type Attribution,
} from "@/lib/request-context.server";
import { logActivity } from "@/lib/activity.server";

/**
 * לקוח אחד (contacts): הזהות הגלובלית של אדם — לפי טלפון מנורמל, ואם אין,
 * מייל; משתמש רשום מקושר ב-user_id. הסוכן המטפל נשמר על ה-contact ונקבע
 * במגע הראשון (קוקי הסוכן → הדף שבו הטופס נשלח → המשרד). רק מנהל משנה.
 */

export type ContactRecord = {
  id: string;
  phone_normalized: string | null;
  email: string | null;
  full_name: string | null;
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
  consent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const CONTACT_COLUMNS =
  "id,phone_normalized,email,full_name,user_id,assigned_site_id,assigned_at,first_source,first_site_id,first_utm_source,first_utm_campaign,first_utm_content,first_referrer,first_landing_path,marketing_consent,consent_at,notes,created_at,updated_at";

export type ResolveContactInput = {
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  userId?: string | null;
  /** מקור הפנייה הנוכחית (source של הליד) */
  source: string;
  /** הדף שבו נשלחה הפנייה — משמש לשיוך רק כשאין סוכן בקוקי */
  pageSiteId?: string | null;
  marketingConsent?: boolean;
  /** ייחוס מפורש (למשל webhook של קמפיין) — אחרת נקרא מהקוקיז של הבקשה */
  attribution?: Partial<Attribution> | null;
};

const cleanEmail = (v: string | null | undefined) => {
  const e = (v ?? "").trim().toLowerCase();
  return e && e.includes("@") ? e.slice(0, 120) : null;
};

/** מזהה ה-site של המשרד (ברירת המחדל לשיוך) */
export async function officeSiteId(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("sites")
    .select("id")
    .eq("slug", OFFICE_SLUG)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** site פעיל לפי slug (הסוכן מהקוקי) */
async function activeSiteBySlug(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * הסוכן שאליו ישויך לקוח *חדש*: קוקי הסוכן (מגע ראשון) → הדף הנוכחי → המשרד.
 */
export async function pickAssignedSite(
  attribution: Attribution,
  pageSiteId: string | null | undefined,
): Promise<string | null> {
  const fromCookie = await activeSiteBySlug(attribution.agentSlug);
  if (fromCookie) return fromCookie;
  if (pageSiteId) return pageSiteId;
  return officeSiteId();
}

/**
 * איתור/יצירת לקוח. סדר הזיהוי: משתמש רשום → טלפון מנורמל → מייל.
 * לקוח קיים רק *משלים* שדות חסרים (טלפון/מייל/שם/משתמש) ולעולם לא מאבד
 * את הסוכן המטפל שלו.
 */
export async function resolveContact(
  input: ResolveContactInput,
): Promise<{ contact: ContactRecord; created: boolean; attribution: Attribution }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const phone = normalizePhone(input.phone) || null;
  const email = cleanEmail(input.email);
  const fullName = (input.fullName ?? "").trim().slice(0, 120) || null;
  const attribution: Attribution = { ...attributionFromRequest(), ...(input.attribution ?? {}) };

  let existing: ContactRecord | null = null;
  if (input.userId) {
    const { data } = await supabaseAdmin
      .from("contacts")
      .select(CONTACT_COLUMNS)
      .eq("user_id", input.userId)
      .maybeSingle();
    existing = (data as unknown as ContactRecord | null) ?? null;
  }
  if (!existing && phone) {
    const { data } = await supabaseAdmin
      .from("contacts")
      .select(CONTACT_COLUMNS)
      .eq("phone_normalized", phone)
      .maybeSingle();
    existing = (data as unknown as ContactRecord | null) ?? null;
  }
  if (!existing && email) {
    const { data } = await supabaseAdmin
      .from("contacts")
      .select(CONTACT_COLUMNS)
      .ilike("email", email)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    existing = (data as unknown as ContactRecord | null) ?? null;
  }

  if (existing) {
    const patch: Partial<Record<keyof ContactRecord, unknown>> = {};
    if (!existing.phone_normalized && phone) patch["phone_normalized"] = phone;
    if (!existing.email && email) patch["email"] = email;
    if ((!existing.full_name || existing.full_name === "לקוח רשום") && fullName)
      patch["full_name"] = fullName;
    if (!existing.user_id && input.userId) patch["user_id"] = input.userId;
    if (input.marketingConsent && !existing.marketing_consent) {
      patch["marketing_consent"] = true;
      patch["consent_at"] = new Date().toISOString();
    }
    if (!existing.assigned_site_id) {
      const siteId = await pickAssignedSite(attribution, input.pageSiteId);
      if (siteId) {
        patch["assigned_site_id"] = siteId;
        patch["assigned_at"] = new Date().toISOString();
      }
    }
    if (Object.keys(patch).length) {
      const { data: updated, error } = await supabaseAdmin
        .from("contacts")
        .update(patch as never)
        .eq("id", existing.id)
        .select(CONTACT_COLUMNS)
        .single();
      // התנגשות ייחודיות (למשל user_id שכבר משויך ל-contact אחר) — משאירים כפי שהוא
      if (!error && updated) existing = updated as unknown as ContactRecord;
    }
    return { contact: existing, created: false, attribution };
  }

  const assignedSiteId = await pickAssignedSite(attribution, input.pageSiteId);
  const { data: inserted, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      phone_normalized: phone,
      email,
      full_name: fullName,
      user_id: input.userId ?? null,
      assigned_site_id: assignedSiteId,
      assigned_at: assignedSiteId ? new Date().toISOString() : null,
      first_source: input.source,
      first_site_id: input.pageSiteId ?? assignedSiteId,
      first_utm_source: attribution.utmSource,
      first_utm_campaign: attribution.utmCampaign,
      first_utm_content: attribution.utmContent,
      first_referrer: attribution.referrer,
      first_landing_path: attribution.landingPath,
      marketing_consent: input.marketingConsent === true,
      consent_at: input.marketingConsent ? new Date().toISOString() : null,
    })
    .select(CONTACT_COLUMNS)
    .single();
  if (error) {
    // מרוץ בין שתי בקשות — נסה שוב לאתר
    if (error.code === "23505") {
      const retry = await resolveContact({ ...input, attribution });
      return retry;
    }
    throw new Error(error.message);
  }
  const contact = inserted as unknown as ContactRecord;
  await logActivity({
    kind: "client",
    event: "contact_created",
    siteId: contact.assigned_site_id,
    contactId: contact.id,
    message: `לקוח חדש: ${contact.full_name ?? "ללא שם"} (${input.source}${sourceLabel(attribution) ? `, ${sourceLabel(attribution)}` : ""})`,
    metadata: {
      source: input.source,
      utm_source: attribution.utmSource,
      agent_slug: attribution.agentSlug,
    },
  });
  return { contact, created: true, attribution };
}

/** העברת לקוח (וכל הלידים הפתוחים שלו) לסוכן אחר — מנהל בלבד */
export async function reassignContact(
  contactId: string,
  siteId: string,
  byUserId: string,
): Promise<{ movedLeads: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { CLOSED_LEAD_STATUSES } = await import("@/lib/leads");
  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) throw new Error("הלקוח לא נמצא");
  const previous = (contact as unknown as ContactRecord).assigned_site_id;
  const { error } = await supabaseAdmin
    .from("contacts")
    .update({
      assigned_site_id: siteId,
      assigned_by: byUserId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", contactId);
  if (error) throw new Error(error.message);

  const closed = [...CLOSED_LEAD_STATUSES] as string[];
  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, site_id")
    .eq("contact_id", contactId)
    .not("status", "in", `(${closed.map((s) => `"${s}"`).join(",")})`);
  let moved = 0;
  for (const lead of leads ?? []) {
    if (lead.site_id === siteId) continue;
    const { error: leadErr } = await supabaseAdmin
      .from("leads")
      .update({ site_id: siteId, reassigned_from_site_id: lead.site_id })
      .eq("id", lead.id);
    if (leadErr) continue;
    // ציר הזמן של הליד עובר איתו (site_id דנורמלי)
    await supabaseAdmin.from("lead_events").update({ site_id: siteId }).eq("lead_id", lead.id);
    await supabaseAdmin.from("lead_events").insert({
      lead_id: lead.id,
      site_id: siteId,
      event_type: "note",
      note: "הליד הועבר לסוכן אחר על ידי המנהל",
      metadata: { from_site_id: lead.site_id, to_site_id: siteId },
      actor_user_id: byUserId,
    });
    moved += 1;
  }
  await logActivity({
    kind: "admin",
    event: "contact_reassigned",
    siteId,
    contactId,
    actorUserId: byUserId,
    message: `לקוח הועבר לסוכן אחר (${moved} לידים)`,
    metadata: { from_site_id: previous, to_site_id: siteId, moved },
  });
  return { movedLeads: moved };
}
