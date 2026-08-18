import type { ListingInput } from "@/lib/listing-schema";
import { sendPendingListingNotifications, notifyAgentOfMatches } from "@/lib/notify.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- קליינט Supabase של המשתמש מה-middleware
type Ctx = { supabase: any; userId: string };

export type ManagedSite = { id: string; slug: string; name: string; is_active: boolean };

/** מאמת שהמשתמש הוא ה־ADMIN (הבעלים — אלי) */
export async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/**
 * מאמת שהמשתמש הוא המנהל הראשי (super admin — אלי).
 * שער אפליקטיבי בלבד: מדיניות ה-RLS ממשיכה להסתמך על 'admin'.
 */
export async function assertSuperAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/**
 * ההרשאות של המשתמש באזור הניהול: אדמין רואה את כל האתרים,
 * סוכן רואה רק את האתרים שבבעלותו (RLS על sites כבר אוכף את זה).
 */
export async function getManagerAccess(context: Ctx): Promise<{
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAgent: boolean;
  sites: ManagedSite[];
}> {
  const [{ data: isAdmin, error }, { data: isSuperAdmin, error: superError }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  if (error) throw new Error(error.message);
  if (superError) throw new Error(superError.message);

  const { data: sites, error: sitesError } = await context.supabase
    .from("sites")
    .select("id, slug, name, is_active")
    .order("sort_order", { ascending: true });
  if (sitesError) throw new Error(sitesError.message);

  let rows = (sites ?? []) as ManagedSite[];

  // ריפוי-עצמי: אדמין בלי אף רשומת site (מסד שהוקם לפני מודל האתרים) —
  // יוצרים לו את אתר ברירת המחדל, כדי שכל הטאבים תלויי-ה-site יעבדו.
  if (isAdmin && rows.length === 0) {
    rows = await ensureDefaultSite(context.userId);
  }

  return {
    isAdmin: Boolean(isAdmin),
    isSuperAdmin: Boolean(isSuperAdmin),
    isAgent: !isAdmin && rows.length > 0,
    sites: rows,
  };
}

/** יוצר את אתר ברירת המחדל (sun-city) בבעלות האדמין הנתון ומחזיר את הרשימה */
async function ensureDefaultSite(ownerId: string): Promise<ManagedSite[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SITE_CONFIG } = await import("@/lib/site-data");

    const { data: existing } = await supabaseAdmin
      .from("sites")
      .select("id, slug, name, is_active")
      .eq("slug", "sun-city")
      .maybeSingle();
    if (!existing) {
      const { error } = await supabaseAdmin
        .from("sites")
        .insert({ slug: "sun-city", name: SITE_CONFIG.name, owner_id: ownerId });
      if (error) {
        console.error("ensureDefaultSite insert failed", error.message);
        return [];
      }
    }

    const { data: sites } = await supabaseAdmin
      .from("sites")
      .select("id, slug, name, is_active")
      .order("sort_order", { ascending: true });
    return (sites ?? []) as ManagedSite[];
  } catch (err) {
    console.error("ensureDefaultSite failed", err);
    return [];
  }
}

/** מאמת גישת ניהול (אדמין או סוכן עם אתר) ומחזיר את ההרשאות */
export async function assertManager(context: Ctx) {
  const access = await getManagerAccess(context);
  if (!access.isAdmin && !access.isAgent) throw new Error("Forbidden");
  return access;
}

/** מאמת שהמשתמש רשאי לנהל את ה-site המבוקש, ומחזיר את הרשומה */
export async function assertSiteAccess(context: Ctx, siteId: string): Promise<ManagedSite> {
  const access = await assertManager(context);
  const site = access.sites.filter((s) => s.id === siteId)[0];
  if (!site) throw new Error("Forbidden");
  return site;
}

/**
 * שומר נכס, ואם הוא מפורסם — מייצר התראות ללקוחות תואמים (מייל + וואטסאפ),
 * מודיע לסוכן המפרסם ולמנהל הראשי, ומפרסם אוטומטית לעמוד הפייסבוק של הדף
 * כשנכס חדש נוצר ויש חיבור פייסבוק פעיל.
 */
export async function saveListingAndNotify(context: Ctx, input: ListingInput, siteUrl: string) {
  const { id, ...fields } = input;

  const isNew = !id;
  let listingId = id ?? null;

  if (listingId) {
    const { error } = await context.supabase.from("listings").update(fields).eq("id", listingId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await context.supabase
      .from("listings")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    listingId = data.id as string;
  }

  let matched = 0;
  let emailsSent = 0;
  let emailsPending = 0;
  let waSent = 0;
  let facebookPosted = false;

  if (fields.is_published && listingId) {
    const { data: count, error: matchError } = await context.supabase.rpc(
      "match_listing_to_profiles",
      {
        p_listing_id: listingId,
      },
    );
    if (matchError) throw new Error(matchError.message);
    matched = Number(count ?? 0);

    const minimal = {
      id: listingId,
      title: fields.title,
      neighborhood: fields.neighborhood,
      price: fields.price,
      rooms: fields.rooms,
      size_sqm: fields.size_sqm,
      description: fields.description,
    };

    // הסוכן המפרסם — לצירוף לינק יצירת קשר בהודעות ללקוחות
    let agent: { name: string; phoneTel: string | null } | null = null;
    const siteId = fields.site_id ?? null;
    if (siteId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: content } = await supabaseAdmin
          .from("site_content")
          .select("business")
          .eq("site_id", siteId)
          .maybeSingle();
        const business = (content?.business ?? {}) as {
          agentName?: string;
          name?: string;
          phoneTel?: string;
        };
        agent = {
          name: business.agentName || business.name || "הסוכן",
          phoneTel: business.phoneTel ?? null,
        };
      } catch {
        agent = null;
      }
    }

    const result = await sendPendingListingNotifications(minimal, `${siteUrl}/#properties`, agent);
    emailsSent = result.sent;
    emailsPending = result.pending;
    waSent = result.waSent;

    // התראה לסוכן ולמנהל הראשי — כשל כאן לא מפיל את השמירה
    try {
      await notifyAgentOfMatches(minimal, siteId, result.recipients, `${siteUrl}/#properties`);
    } catch (e) {
      console.error("notifyAgentOfMatches failed", e instanceof Error ? e.message : e);
    }

    // פרסום אוטומטי לפייסבוק — רק לנכס חדש, כשיש חיבור עמוד פעיל לדף.
    // (אינסטגרם/טיקטוק: אין API ציבורי לפרסום אוטומטי — הפרסום שם נשאר ידני בטאב הפרסום)
    if (isNew && siteId) {
      try {
        const { getConnectionStatus, publishListingToPage } = await import("@/lib/facebook.server");
        const status = await getConnectionStatus(siteId);
        if (status.connected) {
          const details = [
            `שכונה: ${fields.neighborhood ?? "נתניה"}`,
            fields.rooms != null ? `${fields.rooms} חדרים` : null,
            fields.size_sqm != null ? `${fields.size_sqm} מ"ר` : null,
            fields.price != null ? `מחיר: ${fields.price.toLocaleString("he-IL")} ₪` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          const message = `🏠 חדש אצלנו! ${fields.title}\n${details}\n${fields.description ?? ""}\n\nלפרטים באתר: ${siteUrl}/#properties`;
          await publishListingToPage(listingId, message, context.userId, siteUrl);
          facebookPosted = true;
        }
      } catch (e) {
        console.error("facebook auto-post failed", e instanceof Error ? e.message : e);
      }
    }
  }

  return { ok: true, id: listingId, matched, emailsSent, emailsPending, waSent, facebookPosted };
}
