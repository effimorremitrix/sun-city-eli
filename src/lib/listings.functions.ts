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
    return (data ?? []) as unknown as Listing[];
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
    return (data ?? []) as unknown as Listing[];
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
