import type { Listing, ListingImage } from "@/lib/listings";

const BUCKET = "listing-images";
const SIGNED_TTL = 60 * 60 * 24 * 7; // שבוע

type RawImage = {
  id: string;
  listing_id: string;
  storage_path: string | null;
  external_url: string | null;
  sort_order: number;
  kind: "image" | "video" | null;
};

/** מחזיר את התמונות של הנכסים, עם כתובות חתומות לקבצים שבאחסון */
export async function fetchListingImages(
  listingIds: string[],
): Promise<Map<string, ListingImage[]>> {
  const map = new Map<string, ListingImage[]>();
  if (!listingIds.length) return map;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("listing_images")
    .select("id, listing_id, storage_path, external_url, sort_order, kind")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("fetchListingImages failed", error.message);
    return map;
  }

  const rows = (data ?? []) as unknown as RawImage[];
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));

  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls, error: signError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_TTL);
    if (signError) console.error("createSignedUrls failed", signError.message);
    for (const item of urls ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
    }
  }

  for (const row of rows) {
    const url = row.storage_path ? signed.get(row.storage_path) : row.external_url;
    if (!url) continue;
    const list = map.get(row.listing_id) ?? [];
    list.push({
      id: row.id,
      url,
      storage_path: row.storage_path,
      external_url: row.external_url,
      sort_order: row.sort_order,
      kind: row.kind === "video" ? "video" : "image",
    });
    map.set(row.listing_id, list);
  }

  return map;
}

/** מצרף לכל נכס את מערך התמונות שלו */
export async function attachListingImages(listings: Listing[]): Promise<Listing[]> {
  const map = await fetchListingImages(listings.map((l) => l.id));
  return listings.map((l) => ({ ...l, images: map.get(l.id) ?? [] }));
}

export const LISTING_IMAGES_BUCKET = BUCKET;
