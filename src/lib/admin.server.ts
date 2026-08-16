import type { ListingInput } from "@/lib/listing-schema";
import { sendPendingListingEmails } from "@/lib/notify.server";

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
 * ההרשאות של המשתמש באזור הניהול: אדמין רואה את כל האתרים,
 * סוכן רואה רק את האתרים שבבעלותו (RLS על sites כבר אוכף את זה).
 */
export async function getManagerAccess(context: Ctx): Promise<{
  isAdmin: boolean;
  isAgent: boolean;
  sites: ManagedSite[];
}> {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);

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

  return { isAdmin: Boolean(isAdmin), isAgent: !isAdmin && rows.length > 0, sites: rows };
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

/** שומר נכס, ואם הוא מפורסם — מייצר התראות ושולח מיילים ללקוחות תואמים */
export async function saveListingAndNotify(context: Ctx, input: ListingInput, siteUrl: string) {
  const { id, ...fields } = input;

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

  if (fields.is_published && listingId) {
    const { data: count, error: matchError } = await context.supabase.rpc(
      "match_listing_to_profiles",
      {
        p_listing_id: listingId,
      },
    );
    if (matchError) throw new Error(matchError.message);
    matched = Number(count ?? 0);

    const result = await sendPendingListingEmails(
      {
        id: listingId,
        title: fields.title,
        neighborhood: fields.neighborhood,
        price: fields.price,
        rooms: fields.rooms,
        size_sqm: fields.size_sqm,
        description: fields.description,
      },
      `${siteUrl}/#properties`,
    );
    emailsSent = result.sent;
    emailsPending = result.pending;
  }

  // תרגום AI ל-en/fr/ru — רץ ברקע, מדלג אם המקור לא השתנה (source_hash)
  if (listingId) {
    const { translateListing } = await import("@/lib/translate.server");
    void translateListing(listingId);
  }

  return { ok: true, id: listingId, matched, emailsSent, emailsPending };
}
