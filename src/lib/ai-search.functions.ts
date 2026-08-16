import { createServerFn } from "@tanstack/react-start";
import type { ListingFilters } from "@/lib/listings";
import type { ScoutCandidate } from "@/lib/scout.server";

/** מכסת סריקות אינטרנט יומית למשתמש מחובר (ניתן לשינוי במשתנה סביבה) */
const DAILY_WEB_SEARCH_LIMIT = Number(process.env["CLIENT_WEB_SEARCH_DAILY_LIMIT"] ?? "") || 5;
const WEB_FEATURE = "client_web_search";

export type AiWebStatus = "ok" | "login_required" | "quota_exceeded" | "unavailable";

export type AiSearchResult = {
  filters: ListingFilters;
  explanation: string;
  ids: string[];
  count: number;
  /** מועמדים אמיתיים מהאינטרנט (רק למשתמשים מחוברים, עם מכסה יומית) */
  web: {
    status: AiWebStatus;
    candidates: ScoutCandidate[];
    remaining: number | null;
  };
};

/** כמה סריקות אינטרנט המשתמש כבר הריץ היום (לפי יומן השימוש) */
async function usedWebSearchesToday(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("feature", WEB_FEATURE)
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", startOfDay.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * חיפוש נכסים בטקסט חופשי:
 * 1. ה-AI ממיר את הבקשה לפילטרים ומסנן את הנכסים האמיתיים מהמסד.
 * 2. למשתמש מחובר — גם סריקת אינטרנט אמיתית (אותו מנוע כמו סוכן הסריקה
 *    של האדמין), מוגבלת במכסה יומית שנאכפת בשרת מול ai_usage_events.
 */
export const aiSearchListings = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; includeWeb?: boolean }) => {
    const query = String(input?.query ?? "")
      .trim()
      .slice(0, 300);
    if (query.length < 3) throw new Error("נא לתאר מה אתם מחפשים (לפחות 3 תווים)");
    return { query, includeWeb: input?.includeWeb !== false };
  })
  .handler(async ({ data }): Promise<AiSearchResult> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const { extractFilters } = await import("@/lib/ai-search.server");
    const { LISTING_COLUMNS, matchesFilters } = await import("@/lib/listings");
    const { neighborhoods } = await import("@/lib/site-data");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");

    const db = publicDb();
    if (!db) throw new Error("החיפוש אינו זמין כרגע");

    const userId = await getOptionalUserId();
    const { filters, explanation } = await extractFilters(data.query, [...neighborhoods], userId);

    const { data: rows, error } = await db
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("טעינת הנכסים נכשלה");

    const matched = (rows ?? []).filter((l) => matchesFilters(l as never, filters));

    // סריקת אינטרנט — למשתמשים מחוברים בלבד, עם מכסה יומית
    let web: AiSearchResult["web"] = { status: "login_required", candidates: [], remaining: null };
    if (data.includeWeb && userId) {
      try {
        const used = await usedWebSearchesToday(userId);
        if (used >= DAILY_WEB_SEARCH_LIMIT) {
          web = { status: "quota_exceeded", candidates: [], remaining: 0 };
        } else {
          const { runWebPropertySearch } = await import("@/lib/scout.server");
          const { candidates } = await runWebPropertySearch(
            {
              id: "client-search",
              label: "חיפוש לקוח",
              deal_type: filters.deal_type ?? "מכירה",
              city: "נתניה",
              neighborhoods: filters.neighborhoods ?? [],
              min_price: filters.min_price ?? null,
              max_price: filters.max_price ?? null,
              min_rooms: filters.min_rooms ?? null,
              min_size: filters.min_size ?? null,
              needs_mamad: Boolean(filters.needs_mamad),
              needs_elevator: Boolean(filters.needs_elevator),
              needs_parking: Boolean(filters.needs_parking),
              needs_balcony: Boolean(filters.needs_balcony),
              sources: ["yad2", "madlan", "homeless", "komo", "winwin"],
              notes: data.query,
              is_active: true,
              last_run_at: null,
            },
            [...neighborhoods],
            userId,
            WEB_FEATURE,
          );
          web = {
            status: "ok",
            candidates,
            remaining: Math.max(0, DAILY_WEB_SEARCH_LIMIT - used - 1),
          };
        }
      } catch (err) {
        console.error("client web search failed", err);
        web = { status: "unavailable", candidates: [], remaining: null };
      }
    }

    return {
      filters,
      explanation,
      ids: matched.map((l) => (l as { id: string }).id),
      count: matched.length,
      web,
    };
  });
