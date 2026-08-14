import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTING_COLUMNS, type Listing } from "@/lib/listings";
import { listingInputSchema } from "@/lib/listing-schema";

/* ----------------------- קריאה ציבורית ----------------------- */

export const listPublicListings = createServerFn({ method: "GET" }).handler(
  async (): Promise<Listing[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];
    const { data, error } = await db
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("listPublicListings failed", error.message);
      return [];
    }
    const { attachListingImages } = await import("@/lib/listing-images.server");
    return attachListingImages((data ?? []) as unknown as Listing[]);
  },
);

/* ----------------------- ניהול (ADMIN בלבד) ----------------------- */

export const adminListListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("listings")
      .select(LISTING_COLUMNS)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const { attachListingImages } = await import("@/lib/listing-images.server");
    return attachListingImages((data ?? []) as unknown as Listing[]);
  });


export const adminSaveListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listingInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, saveListingAndNotify } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const origin = new URL(getRequest().url).origin;
    return saveListingAndNotify(context, data, origin);
  });

export const adminDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
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
      items: Array<{ storage_path?: string | null; external_url?: string | null }>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const { data: existing, error: countError } = await context.supabase
      .from("listing_images")
      .select("id")
      .eq("listing_id", data.listing_id);
    if (countError) throw new Error(countError.message);

    const start = (existing ?? []).length;
    if (start + data.items.length > 10) throw new Error("אפשר עד 10 תמונות לנכס");

    const rows = data.items.map((item, index) => ({
      listing_id: data.listing_id,
      storage_path: item.storage_path ?? null,
      external_url: item.external_url ?? null,
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
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

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
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

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
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { fetchListingImages } = await import("@/lib/listing-images.server");
    const map = await fetchListingImages([data.listing_id]);
    return map.get(data.listing_id) ?? [];
  });
