import type { ScoutCandidate, ScoutProfile } from "@/lib/scout.server";
import {
  NEIGHBORHOODS,
  canonicalNeighborhood,
  neighborhoods as canonical,
} from "@/lib/neighborhoods";
import { normalizeHebrew } from "@/lib/yad2.server";
import { intentToListingDeal } from "@/lib/deal-type";
import { getSettings } from "@/lib/settings.server";
import { logActivity } from "@/lib/activity.server";

/**
 * ============================================================
 * סריקת השוק הלילית: לכל (סוג עסקה × שכונה) שלקוח כלשהו מבקש נסרקים
 * הלוחות (יד2 וקומו ישירות — בלי עלות AI; מדלן/הומלס/וין וין דרך חיפוש
 * Claude רק אם הופעל בהגדרות), והמודעות נשמרות ב-market_listings עם דדופ
 * לפי קישור המקור. כל ריצה מטפלת במספר משימות מוגבל ומסיימת מהר —
 * המתזמן קורא שוב ושוב בחלון הלילה עד שהכול נסרק.
 * ============================================================
 */

const ALL_HOODS = "*";
const RUN_BUDGET_MS = 50_000;

const SOURCE_KEYS: Record<string, string> = {
  יד2: "yad2",
  קומו: "komo",
  מדלן: "madlan",
  הומלס: "homeless",
  "וין וין": "winwin",
  פייסבוק: "facebook",
  אינסטגרם: "instagram",
  "רשות המיסים": "nadlan",
};

/** שכונה קנונית מתוך טקסט של לוח (וריאנטים של כתיב) — null כשלא מזוהה */
export function canonicalHood(raw: string | null): string | null {
  if (!raw) return null;
  const direct = canonicalNeighborhood(raw.trim());
  if (canonical.includes(direct)) return direct;
  const n = normalizeHebrew(raw);
  for (const h of NEIGHBORHOODS) {
    const c = normalizeHebrew(h.he);
    if (n === c || n.includes(c) || c.includes(n)) return h.he;
  }
  return null;
}

type Demand = { deal: "מכירה" | "השכרה"; hood: string; demand: number };

/** ביקוש: מה הלקוחות הפעילים (פרופילים + לידים עם הסכמה) מבקשים לסרוק */
export async function refreshScanTasks(): Promise<{ tasks: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: profiles }, { data: leads }] = await Promise.all([
    supabaseAdmin.from("search_profiles").select("deal_type, neighborhoods").eq("is_active", true),
    supabaseAdmin
      .from("leads")
      .select("deal_type, neighborhoods, status, marketing_consent")
      .eq("marketing_consent", true)
      .not("status", "in", '("נסגרה עסקה","לא רלוונטי","לא בשל כרגע")'),
  ]);

  const demand = new Map<string, Demand>();
  const add = (deal: "מכירה" | "השכרה", hood: string) => {
    const key = `${deal}|${hood}`;
    const cur = demand.get(key);
    if (cur) cur.demand += 1;
    else demand.set(key, { deal, hood, demand: 1 });
  };
  for (const row of [...(profiles ?? []), ...(leads ?? [])] as Array<{
    deal_type: string | null;
    neighborhoods: string[] | null;
  }>) {
    const deal = intentToListingDeal(row.deal_type);
    if (!deal) continue;
    const hoods = (row.neighborhoods ?? [])
      .map(canonicalNeighborhood)
      .filter((h) => canonical.includes(h));
    if (!hoods.length) add(deal, ALL_HOODS);
    else for (const h of [...new Set(hoods)]) add(deal, h);
  }

  const rows = [...demand.entries()].map(([key, d]) => ({
    key,
    deal_type: d.deal,
    neighborhood: d.hood,
    demand: d.demand,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await supabaseAdmin
      .from("market_scan_tasks")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  // משימות שאין להן יותר ביקוש
  const keys = rows.map((r) => r.key);
  if (keys.length) {
    await supabaseAdmin
      .from("market_scan_tasks")
      .delete()
      .not("key", "in", `(${keys.map((k) => `"${k}"`).join(",")})`);
  } else {
    await supabaseAdmin.from("market_scan_tasks").delete().neq("key", "");
  }
  return { tasks: rows.length };
}

function candidateToRow(c: ScoutCandidate, deal: "מכירה" | "השכרה", now: string) {
  const source =
    SOURCE_KEYS[c.source_site] ?? c.source_site.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
  return {
    source,
    source_site: c.source_site,
    source_url: c.source_url,
    deal_type: c.deal_type === "השכרה" || c.deal_type === "מכירה" ? c.deal_type : deal,
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
    raw: { match_reason: c.match_reason, raw_neighborhood: c.neighborhood } as never,
    last_seen_at: now,
    is_active: true,
  };
}

export type MarketScanSummary = {
  tasksRun: number;
  tasksLeft: number;
  found: number;
  upserted: number;
  deactivated: number;
  errors: string[];
  llmSearches: number;
};

/** ריצה אחת של הסריקה: עד maxTasks משימות שטרם נסרקו ב-20 השעות האחרונות */
export async function runMarketScan(
  opts: { maxTasks?: number; force?: boolean } = {},
): Promise<MarketScanSummary> {
  const settings = await getSettings();
  const summary: MarketScanSummary = {
    tasksRun: 0,
    tasksLeft: 0,
    found: 0,
    upserted: 0,
    deactivated: 0,
    errors: [],
    llmSearches: 0,
  };
  if (!settings.market_scan_enabled && !opts.force) {
    summary.errors.push("סריקת השוק כבויה בהגדרות");
    return summary;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runWebPropertySearch } = await import("@/lib/scout.server");

  await refreshScanTasks();
  const staleBefore = new Date(Date.now() - 20 * 3600_000).toISOString();
  const { data: tasks } = await supabaseAdmin
    .from("market_scan_tasks")
    .select("key, deal_type, neighborhood, demand, last_scanned_at")
    .or(`last_scanned_at.is.null,last_scanned_at.lt.${staleBefore}`)
    .order("demand", { ascending: false })
    .order("last_scanned_at", { ascending: true, nullsFirst: true });
  const pending = tasks ?? [];
  const batch = pending.slice(0, opts.maxTasks ?? settings.market_scan_tasks_per_run);
  summary.tasksLeft = Math.max(0, pending.length - batch.length);

  const sources = [
    "yad2",
    "komo",
    ...(settings.market_scan_llm_sources_enabled ? ["madlan", "homeless", "winwin"] : []),
  ];
  const started = Date.now();

  for (const task of batch) {
    if (Date.now() - started > RUN_BUDGET_MS) {
      summary.tasksLeft += 1;
      continue;
    }
    const deal = task.deal_type as "מכירה" | "השכרה";
    const profile: ScoutProfile = {
      id: `market:${task.key}`,
      label: `שוק ${deal} ${task.neighborhood}`,
      deal_type: deal,
      city: "נתניה",
      neighborhoods: task.neighborhood === ALL_HOODS ? [] : [task.neighborhood],
      min_price: null,
      max_price: null,
      min_rooms: null,
      max_rooms: null,
      min_size: null,
      needs_mamad: false,
      needs_elevator: false,
      needs_parking: false,
      needs_balcony: false,
      sources,
      notes: null,
      is_active: true,
      last_run_at: null,
    };
    const now = new Date().toISOString();
    try {
      const result = await runWebPropertySearch(profile, [...canonical], null, "market_scan", {
        limit: 400,
      });
      summary.llmSearches += result.searches;
      summary.found += result.candidates.length;
      const rows = result.candidates.map((c) => candidateToRow(c, deal, now));
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await supabaseAdmin
          .from("market_listings")
          .upsert(chunk, { onConflict: "source_url", ignoreDuplicates: false });
        if (error) summary.errors.push(`${task.key}: ${error.message}`);
        else summary.upserted += chunk.length;
      }
      const siteErrors = result.sites.filter((s) => s.error).map((s) => `${s.site}: ${s.error}`);
      await supabaseAdmin
        .from("market_scan_tasks")
        .update({
          last_scanned_at: now,
          last_found: result.candidates.length,
          last_error: siteErrors.join(" | ").slice(0, 300) || null,
        })
        .eq("key", task.key);
      summary.tasksRun += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`${task.key}: ${msg}`);
      await supabaseAdmin
        .from("market_scan_tasks")
        .update({ last_scanned_at: now, last_error: msg.slice(0, 300) })
        .eq("key", task.key);
    }
  }

  // מודעות שלא נראו TTL ימים — לא פעילות (לא נמחקות: ההיסטוריה נשארת)
  const ttl = new Date(Date.now() - settings.market_listing_ttl_days * 24 * 3600_000).toISOString();
  const { data: stale } = await supabaseAdmin
    .from("market_listings")
    .update({ is_active: false })
    .eq("is_active", true)
    .lt("last_seen_at", ttl)
    .select("id");
  summary.deactivated = stale?.length ?? 0;

  await logActivity({
    kind: "job",
    event: "market_scan",
    status: summary.errors.length && !summary.tasksRun ? "failed" : "ok",
    message: `סריקת שוק: ${summary.tasksRun} משימות, ${summary.found} מודעות, ${summary.upserted} נשמרו${summary.tasksLeft ? `, נותרו ${summary.tasksLeft}` : ""}`,
    error: summary.errors.slice(0, 3).join(" | ") || null,
    metadata: summary as unknown as Record<string, unknown>,
  });
  return summary;
}

/** התאמת מודעות שוק חדשות לפרופילים/לידים (RPC) */
export async function matchNewMarketListings(sinceHours = 26): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin.rpc("match_market_listings", { p_since: since });
  if (error) throw new Error(error.message);
  const matched = Number(data ?? 0);
  await logActivity({
    kind: "job",
    event: "match_profiles",
    message: `התאמות חדשות מהשוק: ${matched}`,
    metadata: { matched, since },
  });
  return matched;
}
