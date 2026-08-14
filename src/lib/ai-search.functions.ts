import { createServerFn } from "@tanstack/react-start";
import type { ListingFilters } from "@/lib/listings";

export type AiSearchResult = {
  filters: ListingFilters;
  explanation: string;
  ids: string[];
  count: number;
};

/** חיפוש נכסים בטקסט חופשי: AI ממיר לפילטרים, והסינון עצמו על נכסים אמיתיים מהמסד */
export const aiSearchListings = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const query = String(input?.query ?? "").trim().slice(0, 300);
    if (query.length < 3) throw new Error("נא לתאר מה אתם מחפשים (לפחות 3 תווים)");
    return { query };
  })
  .handler(async ({ data }): Promise<AiSearchResult> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const { extractFilters } = await import("@/lib/ai-search.server");
    const { LISTING_COLUMNS, matchesFilters } = await import("@/lib/listings");
    const { neighborhoods } = await import("@/lib/site-data");

    const db = publicDb();
    if (!db) throw new Error("החיפוש אינו זמין כרגע");

    const { filters, explanation } = await extractFilters(data.query, [...neighborhoods]);

    const { data: rows, error } = await db
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("טעינת הנכסים נכשלה");

    const matched = (rows ?? []).filter((l) => matchesFilters(l as never, filters));
    return {
      filters,
      explanation,
      ids: matched.map((l) => (l as { id: string }).id),
      count: matched.length,
    };
  });
