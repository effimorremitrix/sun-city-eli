import { createServerFn } from "@tanstack/react-start";
import type { ListingFilters } from "@/lib/listings";
import type { ScoutCandidate } from "@/lib/scout.server";

/** מכסת סריקות אינטרנט יומית למשתמש מחובר (ניתן לשינוי במשתנה סביבה) */
const DAILY_WEB_SEARCH_LIMIT = Number(process.env["CLIENT_WEB_SEARCH_DAILY_LIMIT"] ?? "") || 5;
const WEB_FEATURE = "client_web_search";

export type AiWebStatus = "ok" | "login_required" | "quota_exceeded" | "unavailable";

/** תקציר שקוף של סריקת הרשת — כמה נמצא, כמה נפסל ומה קרה בכל לוח */
export type AiWebSummary = {
  /** כמה מודעות נבדקו בפועל (עברו + נפסלו) */
  scanned: number;
  /** כמה נפסלו בסינון הקשיח (מחיר/חדרים חסרים, התאמה נמוכה וכו') */
  rejected: number;
  /** דוח קצר פר לוח: "יד2: 120 בלוח, 80 נסרקו, 12 תואמות" / שגיאת חסימה */
  sites: Array<{
    site: string;
    total: number;
    fetched: number;
    matched: number;
    error: string | null;
  }>;
};

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
    summary?: AiWebSummary;
  };
};

/**
 * שריון מכסה אטומי-אופטימי: קודם נרשם אירוע שריון, ואז נספרים כל השריונים
 * של היום — אם חצינו את המכסה, השריון שלנו נמחק והבקשה נדחית. כך גם בקשות
 * מקבילות לא יכולות לעבור יחד את המכסה (כל אחת רואה את השריונים של האחרות).
 */
async function reserveWebSearch(
  userId: string,
): Promise<{ ok: true; reservationId: string; used: number } | { ok: false }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { AI_MODEL } = await import("@/lib/ai-usage.server");
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data: reservation, error: insertError } = await supabaseAdmin
    .from("ai_usage_events")
    .insert({
      feature: WEB_FEATURE,
      model: AI_MODEL,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      status: "success",
      user_id: userId,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const { count, error } = await supabaseAdmin
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("feature", WEB_FEATURE)
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", startOfDay.toISOString());
  if (error) throw new Error(error.message);

  if ((count ?? 0) > DAILY_WEB_SEARCH_LIMIT) {
    await supabaseAdmin.from("ai_usage_events").delete().eq("id", reservation.id);
    return { ok: false };
  }
  return { ok: true, reservationId: reservation.id as string, used: count ?? 0 };
}

/** ביטול שריון כשהסריקה עצמה נכשלה — כישלון לא שורף מכסה */
async function releaseWebSearch(reservationId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_usage_events").delete().eq("id", reservationId);
  } catch (err) {
    console.error("releaseWebSearch failed", err);
  }
}

/**
 * חיפוש נכסים בטקסט חופשי:
 * 1. ה-AI ממיר את הבקשה לפילטרים ומסנן את הנכסים האמיתיים מהמסד.
 * 2. למשתמש מחובר — גם סריקת אינטרנט אמיתית (אותו מנוע כמו סוכן הסריקה
 *    של האדמין), מוגבלת במכסה יומית שנאכפת בשרת מול ai_usage_events.
 */
export const aiSearchListings = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; includeWeb?: boolean; lang?: string }) => {
    const query = String(input?.query ?? "")
      .trim()
      .slice(0, 300);
    if (query.length < 3) throw new Error("נא לתאר מה אתם מחפשים (לפחות 3 תווים)");
    const lang = ["he", "en", "fr", "ru"].includes(String(input?.lang))
      ? String(input?.lang)
      : "he";
    return { query, includeWeb: input?.includeWeb !== false, lang };
  })
  .handler(async ({ data }): Promise<AiSearchResult> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const { extractFilters } = await import("@/lib/ai-search.server");
    const { LISTING_COLUMNS, matchesFilters, streetVocabulary, matchQueryStreet } =
      await import("@/lib/listings");
    const { neighborhoods } = await import("@/lib/site-data");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");

    const db = publicDb();
    if (!db) throw new Error("החיפוש אינו זמין כרגע");

    const userId = await getOptionalUserId();

    const { data: rows, error } = await db
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("טעינת הנכסים נכשלה");

    // אוצר הרחובות מהנכסים המפורסמים נשלח למודל כדי שיזהה שם רחוב בודד (למשל "זוארץ")
    const streets = streetVocabulary(
      (rows ?? []) as Array<{ address: string | null; title: string }>,
      [...neighborhoods],
    );
    let { filters, explanation } = await extractFilters(
      data.query,
      [...neighborhoods],
      userId,
      streets,
      data.lang,
    );

    // רשת ביטחון דטרמיניסטית: אם המודל לא חילץ אף פילטר אבל הבקשה מכילה רחוב מוכר
    const hasAnyFilter =
      filters.deal_type != null ||
      (filters.neighborhoods?.length ?? 0) > 0 ||
      filters.street != null ||
      filters.min_price != null ||
      filters.max_price != null ||
      filters.rooms != null ||
      filters.min_rooms != null ||
      filters.max_rooms != null ||
      filters.min_size != null ||
      Boolean(filters.needs_mamad) ||
      Boolean(filters.needs_elevator) ||
      Boolean(filters.needs_parking) ||
      Boolean(filters.needs_balcony);
    if (!hasAnyFilter) {
      const street = matchQueryStreet(data.query, streets);
      if (street) {
        filters = { ...filters, street };
        explanation = `מציג נכסים ברחוב ${street} בנתניה`;
      }
    }

    const matched = (rows ?? []).filter((l) => matchesFilters(l as never, filters));

    // סריקת אינטרנט — למשתמשים מחוברים בלבד, עם מכסה יומית
    let web: AiSearchResult["web"] = { status: "login_required", candidates: [], remaining: null };
    if (data.includeWeb && userId) {
      let reservationId: string | null = null;
      try {
        const reserved = await reserveWebSearch(userId);
        if (!reserved.ok) {
          web = { status: "quota_exceeded", candidates: [], remaining: 0 };
        } else {
          reservationId = reserved.reservationId;
          const used = reserved.used;
          const { runWebPropertySearch } = await import("@/lib/scout.server");
          const { candidates, rejected, sites } = await runWebPropertySearch(
            {
              id: "client-search",
              label: "חיפוש לקוח",
              deal_type: filters.deal_type ?? "מכירה",
              city: "נתניה",
              neighborhoods: filters.neighborhoods ?? [],
              min_price: filters.min_price ?? null,
              max_price: filters.max_price ?? null,
              // "3 חדרים" הוא בקשה למספר מדויק, ולכן הוא נשלח כמינימום וגם
              // כמקסימום — הלוחות מקבלים minRooms/maxRooms ומסננים בעצמם
              min_rooms: filters.rooms ?? filters.min_rooms ?? null,
              max_rooms: filters.rooms ?? filters.max_rooms ?? null,
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
            `${WEB_FEATURE}_api`,
            // הלקוח מקבל רשימה קצרה ומדורגת; הרשימה המלאה שמורה לסוכן האדמין
            { limit: 30 },
          );
          web = {
            status: "ok",
            candidates,
            remaining: Math.max(0, DAILY_WEB_SEARCH_LIMIT - used),
            // שקיפות: הלקוח רואה כמה נסרק וכמה נפסל — סריקה "ריקה" כבר לא
            // נראית כמו תקלה, ורואים גם לוח שחסם את הסריקה
            summary: {
              scanned: candidates.length + rejected.length,
              rejected: rejected.length,
              sites: sites.map((s) => ({
                site: s.site,
                total: s.total,
                fetched: s.fetched,
                matched: s.matched,
                error: s.error,
              })),
            },
          };
        }
      } catch (err) {
        console.error("client web search failed", err);
        if (reservationId) await releaseWebSearch(reservationId);
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
