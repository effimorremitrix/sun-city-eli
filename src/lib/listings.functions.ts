import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTING_COLUMNS, type Listing } from "@/lib/listings";
import { listingInputSchema } from "@/lib/listing-schema";
import type { ManagedSite } from "@/lib/admin.server";
import { OFFICE_SLUG } from "@/lib/site-data";

/** האם הרשימה כוללת את האתר הראשי — נכסים ישנים בלי site_id שייכים אליו */
const includesDefaultSite = (sites: ManagedSite[], ids: string[]) =>
  sites.some((s) => ids.includes(s.id) && s.slug === OFFICE_SLUG);

/* ----------------------- קריאה ציבורית ----------------------- */

/**
 * הנכסים המפורסמים באתר — מלאי אחד משותף לכל הסוכנים. כל נכס שמתפרסם
 * מוצג בכל הדפים, בלי קשר לשאלה מי העלה אותו.
 *
 * slug הוא הסוכן של הדף האישי שבו אנחנו נמצאים, והוא משמש לניתוב הפניות
 * בלבד (ראה attachListingAgents) — לא לסינון המלאי.
 */
export const listPublicListings = createServerFn({ method: "GET" })
  .inputValidator((input?: { slug?: string | null }) => ({ slug: input?.slug ?? null }))
  .handler(async ({ data }): Promise<Listing[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];

    const { data: rows, error } = await db
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("listPublicListings failed", error.message);
      return [];
    }
    const { attachListingImages } = await import("@/lib/listing-images.server");
    const { attachListingAgents } = await import("@/lib/agents.server");
    const withImages = await attachListingImages((rows ?? []) as unknown as Listing[]);
    return attachListingAgents(withImages, data.slug);
  });

/** רשימת הסוכנים הפעילים להצגה ציבורית (כרטיסי צוות + קישור לדף האישי) */
export const listPublicAgents = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPublicAgents } = await import("@/lib/agents.server");
  return fetchPublicAgents();
});

/* ------------------ ניהול (אדמין או סוכן, לפי ה-site) ------------------ */

/**
 * רשימת הנכסים בלוח הניהול. המלאי הציבורי משותף לכל הסוכנים, ולכן גם
 * בדשבורד כל סוכן רואה את כל הנכסים המפורסמים (כולל נכסים שהמשרד הזין) —
 * אבל לעריכה זכאים רק בעלי ה-site של הנכס (או אדמין): שדה `editable`
 * מסמן זאת לכל שורה, וה-UI מציג נכסים זרים לקריאה בלבד.
 */
export const adminListListings = createServerFn({ method: "GET" })
  .inputValidator((input?: { siteId?: string | null }) => ({ siteId: input?.siteId ?? null }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);

    let query = context.supabase
      .from("listings")
      .select(LISTING_COLUMNS)
      .order("sort_order", { ascending: true });

    const ownIds = access.sites.map((s) => s.id);

    if (data.siteId) {
      if (!ownIds.includes(data.siteId)) throw new Error("Forbidden");
      // הנכסים של האתר הנבחר (נכסים ישנים ללא site_id שייכים לאתר הראשי).
      // לסוכן מצורף גם כל המלאי המפורסם המשותף (לקריאה — editable=false);
      // אדמין שבחר אתר בבורר מקבל את האתר הזה בלבד, כדי שהבורר יישאר סינון
      // אמיתי. מדיניות ה-RLS (public_select על מפורסמים + manage_select על
      // שלו) כבר תוחמת את מה שסוכן יכול לראות בפועל.
      const ownFilter = includesDefaultSite(access.sites, [data.siteId])
        ? `site_id.eq.${data.siteId},site_id.is.null`
        : `site_id.eq.${data.siteId}`;
      query = access.isAdmin ? query.or(ownFilter) : query.or(`${ownFilter},is_published.eq.true`);
    } else if (!access.isAdmin) {
      query = includesDefaultSite(access.sites, ownIds)
        ? query.or(`site_id.in.(${ownIds.join(",")}),site_id.is.null,is_published.eq.true`)
        : query.or(`site_id.in.(${ownIds.join(",")}),is_published.eq.true`);
    }
    // אדמין ללא סינון — כל הנכסים של כל הסוכנים

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const officeSelected = data.siteId
      ? includesDefaultSite(access.sites, [data.siteId])
      : includesDefaultSite(access.sites, ownIds);
    const editableFor = (l: Listing) =>
      access.isAdmin ||
      (l.site_id != null && ownIds.includes(l.site_id)) ||
      (l.site_id == null && officeSelected);

    const { attachListingImages } = await import("@/lib/listing-images.server");
    const { attachListingAgents } = await import("@/lib/agents.server");
    const full = await attachListingAgents(
      await attachListingImages((rows ?? []) as unknown as Listing[]),
    );
    return full.map((l) => ({ ...l, editable: editableFor(l) }));
  });

export const adminSaveListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listingInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertManager, saveListingAndNotify } = await import("@/lib/admin.server");
    const access = await assertManager(context);

    // הנכס משויך ל-site: אם לא נבחר — האתר של הסוכן (או הראשי לאדמין)
    let siteId = data.site_id ?? null;
    if (siteId) {
      if (!access.sites.some((s) => s.id === siteId)) throw new Error("Forbidden");
    } else {
      const fallback =
        access.sites.filter((s) => s.slug === OFFICE_SLUG)[0] ?? access.sites[0] ?? null;
      siteId = fallback?.id ?? null;
    }

    // קואורדינטות למפה: ערך ידני מהטופס מנצח; אחרת גיאוקוד מהכתובת.
    // מדלגים על הגיאוקוד כשהכתובת לא השתנתה ויש כבר מיקום — כדי לא לפנות
    // ל-Nominatim בכל שמירה של שינוי מחיר.
    let { lat, lng } = data;
    if (lat == null || lng == null) {
      let needsGeocode = true;
      if (data.id) {
        const { data: existing } = await context.supabase
          .from("listings")
          .select("address, neighborhood, city, lat, lng")
          .eq("id", data.id)
          .maybeSingle();
        const unchanged =
          existing != null &&
          existing.address === data.address &&
          existing.neighborhood === data.neighborhood &&
          existing.city === data.city;
        if (unchanged && existing?.lat != null && existing.lng != null) {
          lat = existing.lat;
          lng = existing.lng;
          needsGeocode = false;
        }
      }
      if (needsGeocode) {
        const { geocodeListing } = await import("@/lib/geocode.server");
        const coords = await geocodeListing(data);
        lat = coords?.lat ?? null;
        lng = coords?.lng ?? null;
      }
    }

    const origin = new URL(getRequest().url).origin;
    return saveListingAndNotify(context, { ...data, site_id: siteId, lat, lng }, origin);
  });

/**
 * השלמת מיקומים לנכסים שאין להם קואורדינטות — לנכסים שנשמרו לפני הוספת
 * המפה, ולנכסים שהגיאוקוד פספס. רץ בקצב שמדיניות Nominatim מתירה.
 *
 * עובד ב-batches קטנים כדי שכל קריאה תסתיים לפני טיימאאוט של פונקציית שרת,
 * וכל נכס נשמר מיד אחרי שאותר — קטיעה באמצע לא מאבדת את מה שכבר הושלם.
 * cursor (after) מאפשר ללקוח להמשיך מעבר לכתובות שלא אותרו, כדי שהן לא
 * יחסמו את שאר הנכסים בקריאות הבאות.
 */
export const adminBackfillListingCoords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { limit?: number; after?: string | null }) => ({
    limit: Math.min(Math.max(input?.limit ?? 8, 1), 10),
    after: input?.after ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);

    const ownIds = access.sites.map((s) => s.id);
    if (!access.isAdmin && !ownIds.length) {
      return { scanned: 0, located: 0, remaining: 0, cursor: null as string | null };
    }

    // סוכן משלים רק את הנכסים של האתר שלו (כולל נכסים ישנים בלי site_id
    // כשהוא מנהל את האתר הראשי — כמו ב-adminListListings); אדמין את כולם
    const applyScope = <
      T extends { or(filters: string): T; in(column: string, values: string[]): T },
    >(
      q: T,
    ): T => {
      if (access.isAdmin) return q;
      return includesDefaultSite(access.sites, ownIds)
        ? q.or(`site_id.in.(${ownIds.join(",")}),site_id.is.null`)
        : q.in("site_id", ownIds);
    };

    let query = applyScope(
      context.supabase
        .from("listings")
        .select("id, address, neighborhood, city")
        .is("lat", null)
        .order("id", { ascending: true })
        .limit(data.limit),
    );
    if (data.after) query = query.gt("id", data.after);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const pending = (rows ?? []) as Array<{
      id: string;
      address: string | null;
      neighborhood: string | null;
      city: string | null;
    }>;

    const { geocodeListing, GEOCODE_MIN_INTERVAL_MS } = await import("@/lib/geocode.server");

    let located = 0;
    for (const [i, row] of pending.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, GEOCODE_MIN_INTERVAL_MS));
      const coords = await geocodeListing(row);
      if (!coords) continue;
      const { error: updateError } = await context.supabase
        .from("listings")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", row.id);
      // נכס אחד שנכשל לא עוצר את השאר
      if (updateError) console.error("coords backfill update failed", row.id, updateError.message);
      else located += 1;
    }

    const { count } = await applyScope(
      context.supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .is("lat", null),
    );

    return {
      scanned: pending.length,
      located,
      remaining: count ?? 0,
      cursor: pending.at(-1)?.id ?? null,
    };
  });

export const adminDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    // RLS מוודא שרק בעל ה-site (או אדמין) יכול למחוק את הנכס
    const { error } = await context.supabase.from("listings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------- תמונות נכס (ADMIN בלבד) ----------------------- */

export const adminAddListingImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      listing_id: string;
      items: Array<{
        storage_path?: string | null;
        external_url?: string | null;
        kind?: "image" | "video";
      }>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);

    const { data: canManage } = await context.supabase.rpc("owns_listing", {
      _listing_id: data.listing_id,
    });
    if (!canManage) throw new Error("Forbidden");

    const { data: existing, error: countError } = await context.supabase
      .from("listing_images")
      .select("id")
      .eq("listing_id", data.listing_id);
    if (countError) throw new Error(countError.message);

    const start = (existing ?? []).length;
    if (start + data.items.length > 12) throw new Error("אפשר עד 12 פריטי מדיה לנכס");

    const rows = data.items.map((item, index) => ({
      listing_id: data.listing_id,
      storage_path: item.storage_path ?? null,
      external_url: item.external_url ?? null,
      kind: item.kind === "video" ? "video" : "image",
      sort_order: start + index,
    }));

    const { error } = await context.supabase.from("listing_images").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, added: rows.length };
  });

export const adminDeleteListingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);

    const { data: row, error: readError } = await context.supabase
      .from("listing_images")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (readError) throw new Error(readError.message);

    const { error } = await context.supabase.from("listing_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const path = (row as { storage_path: string | null } | null)?.storage_path;
    if (path) {
      const { LISTING_IMAGES_BUCKET } = await import("@/lib/listing-images.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).remove([path]);
    }
    return { ok: true };
  });

export const adminReorderListingImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listing_id: string; ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);

    for (const [index, id] of data.ids.entries()) {
      const { error } = await context.supabase
        .from("listing_images")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("listing_id", data.listing_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminListListingImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listing_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);

    const { data: canManage } = await context.supabase.rpc("owns_listing", {
      _listing_id: data.listing_id,
    });
    if (!canManage) throw new Error("Forbidden");
    const { fetchListingImages } = await import("@/lib/listing-images.server");
    const map = await fetchListingImages([data.listing_id]);
    return map.get(data.listing_id) ?? [];
  });
