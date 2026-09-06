import { createServerFn } from "@tanstack/react-start";
import type { ListingFilters } from "@/lib/listings";
import type { ScoutCandidate } from "@/lib/scout.server";
import type { MarketListing } from "@/lib/market";

const WEB_FEATURE = "client_web_search";

export type AiWebStatus = "ok" | "login_required" | "quota_exceeded" | "unavailable" | "skipped";

/** למה החיפוש נחסם — הלקוח מתרגם לשפת הדף */
export type AiLimitReason = "daily" | "burst" | "disabled" | "blocked" | "spend";

/** תקציר שקוף של סריקת הרשת — כמה נמצא, כמה נפסל ומה קרה בכל לוח */
export type AiWebSummary = {
  scanned: number;
  rejected: number;
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
  /** נכסי המשרד שתואמים */
  ids: string[];
  count: number;
  /** מודעות מהשוק (המאגר המשותף) שתואמות לאותם פילטרים */
  marketIds: string[];
  marketCount: number;
  /** סריקה חיה של הלוחות — רק למשתמש מחובר עם מכסה */
  web: {
    status: AiWebStatus;
    candidates: ScoutCandidate[];
    remaining: number | null;
    summary?: AiWebSummary;
  };
  /** null = החיפוש רץ; אחרת נחסם והסיבה */
  limited: AiLimitReason | null;
};

const EMPTY_WEB: AiSearchResult["web"] = { status: "skipped", candidates: [], remaining: null };

function limitedResult(reason: AiLimitReason): AiSearchResult {
  return {
    filters: {},
    explanation: "",
    ids: [],
    count: 0,
    marketIds: [],
    marketCount: 0,
    web: EMPTY_WEB,
    limited: reason,
  };
}

/**
 * שריון מכסה אטומי-אופטימי לסריקה החיה: נרשם אירוע שריון ואז נספרים השריונים
 * של היום — חריגה מוחקת את השריון ודוחה. בקשות מקבילות רואות זו את זו.
 */
async function reserveWebSearch(
  userId: string,
  dailyLimit: number,
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

  if ((count ?? 0) > dailyLimit) {
    await supabaseAdmin.from("ai_usage_events").delete().eq("id", reservation.id);
    return { ok: false };
  }
  return { ok: true, reservationId: reservation.id as string, used: count ?? 0 };
}

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
 * 0. מכסות ומגבלות קצב (IP/מכשיר/משתמש) ותקרת הוצאה יומית — לפני כל קריאת AI.
 * 1. ה-AI ממיר את הבקשה לפילטרים; הסינון עצמו על נכסים אמיתיים בלבד:
 *    נכסי המשרד + מאגר השוק המשותף (מודעות מהלוחות שנסרקו בלילה).
 * 2. למשתמש מחובר — גם סריקה חיה של הלוחות, במכסה יומית משלה.
 */
export const aiSearchListings = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { query: string; includeWeb?: boolean; lang?: string; website?: string | null }) => {
      const query = String(input?.query ?? "")
        .trim()
        .slice(0, 300);
      if (query.length < 3) throw new Error("נא לתאר מה אתם מחפשים (לפחות 3 תווים)");
      const lang = ["he", "en", "fr", "ru"].includes(String(input?.lang))
        ? String(input?.lang)
        : "he";
      return {
        query,
        includeWeb: input?.includeWeb !== false,
        lang,
        website: String(input?.website ?? "").slice(0, 100),
      };
    },
  )
  .handler(async ({ data }): Promise<AiSearchResult> => {
    // honeypot — בוט שמילא את השדה הנסתר מקבל תשובה ריקה בלי לעלות כסף
    if (data.website) return limitedResult("blocked");

    const { publicDb } = await import("@/lib/public-db.server");
    const { extractFilters } = await import("@/lib/ai-search.server");
    const { LISTING_COLUMNS, matchesFilters, streetVocabulary, matchQueryStreet } =
      await import("@/lib/listings");
    const { MARKET_COLUMNS, matchesMarketFilters } = await import("@/lib/market");
    const { neighborhoods } = await import("@/lib/site-data");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");
    const { enforceAiSearchLimits, aiSpendCapReached } = await import("@/lib/rate-limit.server");
    const { getSettings } = await import("@/lib/settings.server");
    const { logActivity } = await import("@/lib/activity.server");

    const db = publicDb();
    if (!db) throw new Error("החיפוש אינו זמין כרגע");

    const userId = await getOptionalUserId();
    const settings = await getSettings();

    // --- מכסות: לפני שנוגעים ב-API ---
    const limit = await enforceAiSearchLimits(userId);
    if (!limit.allowed) {
      const reason: AiLimitReason =
        limit.reason === "blocked"
          ? "blocked"
          : limit.label === "disabled"
            ? "disabled"
            : limit.label === "burst"
              ? "burst"
              : "daily";
      return limitedResult(reason);
    }
    const spend = await aiSpendCapReached();
    if (spend.reached) {
      await logActivity({
        kind: "ai",
        event: "ai_spend_cap",
        status: "blocked",
        message: `תקרת ההוצאה היומית ל-AI הושגה (${spend.spent.toFixed(2)}$ / ${spend.cap}$)`,
      });
      return limitedResult("spend");
    }

    const [{ data: rows, error }, { data: marketRows }] = await Promise.all([
      db
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
      db
        .from("market_listings")
        .select(MARKET_COLUMNS)
        .eq("is_active", true)
        .eq("hidden_by_admin", false)
        .order("first_seen_at", { ascending: false })
        .limit(400),
    ]);
    if (error) throw new Error("טעינת הנכסים נכשלה");

    // אוצר הרחובות מהנכסים המפורסמים נשלח למודל כדי שיזהה שם רחוב בודד
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
      settings.ai_model,
    );

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
    const market = ((marketRows ?? []) as unknown as MarketListing[]).filter((m) =>
      matchesMarketFilters(m, filters),
    );

    // סריקה חיה — משתמשים מחוברים בלבד, מכסה יומית משלה
    let web: AiSearchResult["web"] = { status: "login_required", candidates: [], remaining: null };
    if (data.includeWeb && userId) {
      let reservationId: string | null = null;
      try {
        const reserved = await reserveWebSearch(userId, settings.web_search_user_daily);
        if (!reserved.ok) {
          web = { status: "quota_exceeded", candidates: [], remaining: 0 };
        } else {
          reservationId = reserved.reservationId;
          const used = reserved.used;
          const { runWebPropertySearch } = await import("@/lib/scout.server");
          const { toListingDeal } = await import("@/lib/deal-type");
          const wantedDeal = toListingDeal(filters.deal_type);
          const { candidates, rejected, sites } = await runWebPropertySearch(
            {
              id: "client-search",
              label: "חיפוש לקוח",
              // בלי סוג עסקה מפורש — מחפשים למכירה (הרוב), אבל לא נפסל מה שנמצא
              deal_type: wantedDeal ?? "מכירה",
              city: "נתניה",
              neighborhoods: filters.neighborhoods ?? [],
              min_price: filters.min_price ?? null,
              max_price: filters.max_price ?? null,
              min_rooms: filters.rooms ?? filters.min_rooms ?? null,
              max_rooms: filters.rooms ?? filters.max_rooms ?? null,
              min_size: filters.min_size ?? null,
              needs_mamad: Boolean(filters.needs_mamad),
              needs_elevator: Boolean(filters.needs_elevator),
              needs_parking: Boolean(filters.needs_parking),
              needs_balcony: Boolean(filters.needs_balcony),
              sources: [
                "yad2",
                "komo",
                ...(settings.market_scan_llm_sources_enabled
                  ? ["madlan", "homeless", "winwin"]
                  : []),
              ],
              notes: data.query,
              is_active: true,
              last_run_at: null,
            },
            [...neighborhoods],
            userId,
            `${WEB_FEATURE}_api`,
            { limit: 30 },
          );
          // מה שנמצא בסריקה חיה נשמר גם במאגר השוק — לטובת כל הלקוחות
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { canonicalHood } = await import("@/lib/market-scan.server");
            const now = new Date().toISOString();
            const rowsToSave = candidates.slice(0, 60).map((c) => ({
              source: c.source_site,
              source_site: c.source_site,
              source_url: c.source_url,
              deal_type: c.deal_type === "השכרה" ? "השכרה" : "מכירה",
              city: "נתניה",
              neighborhood: canonicalHood(c.neighborhood),
              address: c.address,
              title: c.title.slice(0, 200),
              description: c.raw_summary,
              price: c.price,
              rooms: c.rooms,
              size_sqm: c.size_sqm,
              has_mamad: c.has_mamad,
              has_elevator: c.has_elevator,
              has_parking: c.has_parking,
              has_balcony: c.has_balcony,
              match_score: c.match_score,
              last_seen_at: now,
              is_active: true,
            }));
            if (rowsToSave.length)
              await supabaseAdmin
                .from("market_listings")
                .upsert(rowsToSave, { onConflict: "source_url" });
          } catch (e) {
            console.error(
              "market upsert from live search failed",
              e instanceof Error ? e.message : e,
            );
          }
          web = {
            status: "ok",
            candidates,
            remaining: Math.max(0, settings.web_search_user_daily - used),
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

    await logActivity({
      kind: "ai",
      event: "ai_search",
      actorUserId: userId,
      message: `חיפוש: "${data.query.slice(0, 120)}" — ${matched.length} נכסי משרד, ${market.length} מהשוק${web.status === "ok" ? `, ${web.candidates.length} בסריקה חיה` : ""}`,
      metadata: {
        query: data.query,
        filters,
        office: matched.length,
        market: market.length,
        web: web.status,
        lang: data.lang,
      },
    });

    return {
      filters,
      explanation,
      ids: matched.map((l) => (l as { id: string }).id),
      count: matched.length,
      marketIds: market.map((m) => m.id),
      marketCount: market.length,
      web,
      limited: null,
    };
  });
