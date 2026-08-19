import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTING_COLUMNS, type Listing } from "@/lib/listings";
import { listingInputSchema } from "@/lib/listing-schema";

/* ----------------------- קריאה ציבורית ----------------------- */

/**
 * הנכסים המפורסמים באתר. בלי slug — כל הנכסים של כל הסוכנים (הדף הראשי);
 * עם slug — רק הנכסים של הסוכן של אותו דף. לכל נכס מוצמד הסוכן שלו,
 * כדי שכל פנייה תנותב אליו.
 */
export const listPublicListings = createServerFn({ method: "GET" })
  .inputValidator((input?: { slug?: string | null }) => ({ slug: input?.slug ?? null }))
  .handler(async ({ data }): Promise<Listing[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];

    let query = db
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (data.slug) {
      const { DEFAULT_SLUG } = await import("@/lib/agents.server");
      const { data: siteId } = await db.rpc("get_site_id", { p_slug: data.slug });
      if (!siteId) return [];
      // נכסים ישנים ללא site_id שייכים לאתר הראשי
      query =
        data.slug === DEFAULT_SLUG
          ? query.or(`site_id.eq.${siteId},site_id.is.null`)
          : query.eq("site_id", siteId as string);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("listPublicListings failed", error.message);
      return [];
    }
    const { attachListingImages } = await import("@/lib/listing-images.server");
    const { attachListingAgents } = await import("@/lib/agents.server");
    const withImages = await attachListingImages((rows ?? []) as unknown as Listing[]);
    return attachListingAgents(withImages);
  });

/** רשימת הסוכנים הפעילים להצגה ציבורית (כרטיסי צוות + קישור לדף האישי) */
export const listPublicAgents = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPublicAgents } = await import("@/lib/agents.server");
  return fetchPublicAgents();
});

/* ------------------ ניהול (אדמין או סוכן, לפי ה-site) ------------------ */

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
    const includesDefault = (ids: string[]) =>
      access.sites.some((s) => ids.includes(s.id) && s.slug === "sun-city");

    if (data.siteId) {
      if (!ownIds.includes(data.siteId)) throw new Error("Forbidden");
      // נכסים ישנים ללא site_id שייכים לאתר הראשי
      query = includesDefault([data.siteId])
        ? query.or(`site_id.eq.${data.siteId},site_id.is.null`)
        : query.eq("site_id", data.siteId);
    } else if (!access.isAdmin) {
      query = includesDefault(ownIds)
        ? query.or(`site_id.in.(${ownIds.join(",")}),site_id.is.null`)
        : query.in("site_id", ownIds);
    }
    // אדמין ללא סינון — כל הנכסים של כל הסוכנים

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const { attachListingImages } = await import("@/lib/listing-images.server");
    const { attachListingAgents } = await import("@/lib/agents.server");
    return attachListingAgents(await attachListingImages((rows ?? []) as unknown as Listing[]));
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
        access.sites.filter((s) => s.slug === "sun-city")[0] ?? access.sites[0] ?? null;
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
 * השלמת מיקומים לנכסים שאין להם קואורדינטות — לשימוש חד־פעמי אחרי הוספת
 * המפה, ולנכסים שהגיאוקוד פספס. רץ בקצב שמדיניות Nominatim מתירה.
 */
export const adminBackfillListingCoords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { limit?: number }) => ({
    limit: Math.min(Math.max(input?.limit ?? 25, 1), 50),
  }))
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);

    let query = context.supabase
      .from("listings")
      .select("id, address, neighborhood, city")
      .is("lat", null)
      .limit(data.limit);

    // סוכן משלים רק את הנכסים של האתר שלו; אדמין את כולם
    if (!access.isAdmin) {
      const ownIds = access.sites.map((s) => s.id);
      if (!ownIds.length) return { scanned: 0, located: 0 };
      query = query.in("site_id", ownIds);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const pending = (rows ?? []) as Array<{
      id: string;
      address: string | null;
      neighborhood: string | null;
      city: string | null;
    }>;
    if (!pending.length) return { scanned: 0, located: 0 };

    const { geocodeMany } = await import("@/lib/geocode.server");
    const results = await geocodeMany(pending);

    let located = 0;
    for (const { id, coords } of results) {
      if (!coords) continue;
      const { error: updateError } = await context.supabase
        .from("listings")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", id);
      if (updateError) throw new Error(updateError.message);
      located += 1;
    }

    return { scanned: pending.length, located };
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
