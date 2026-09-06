/**
 * הגדרות מערכת — שורה אחת ב-app_settings (jsonb), עם ברירות מחדל בקוד.
 * המנהל הראשי משנה אותן בטאב "הגדרות"; הקוד קורא דרך getSettings() עם
 * מטמון קצר לכל מופע שרת (Cloudflare Workers ממחזרים מופעים — 30 שניות
 * מספיקות כדי לא לפנות למסד בכל בקשה).
 */

export type AppSettings = {
  site_url: string;
  cron_secret: string;
  ai_search_enabled: boolean;
  ai_search_anon_daily: number;
  ai_search_user_daily: number;
  ai_search_burst_per_minute: number;
  ai_daily_usd_cap: number;
  ai_model: string;
  web_search_user_daily: number;
  market_scan_enabled: boolean;
  market_scan_llm_sources_enabled: boolean;
  market_scan_tasks_per_run: number;
  market_listing_ttl_days: number;
  leads_per_minute: number;
  signup_per_hour: number;
  feedback_per_minute: number;
  track_per_minute: number;
  auto_block_multiplier: number;
  auto_block_hours: number;
  backup_retention_days: number;
  health_alerts_enabled: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  site_url: "https://sun-city-eli.lovable.app",
  cron_secret: "",
  ai_search_enabled: true,
  ai_search_anon_daily: 5,
  ai_search_user_daily: 20,
  ai_search_burst_per_minute: 6,
  ai_daily_usd_cap: 5,
  ai_model: "claude-sonnet-4-5",
  web_search_user_daily: 5,
  market_scan_enabled: true,
  market_scan_llm_sources_enabled: false,
  market_scan_tasks_per_run: 6,
  market_listing_ttl_days: 14,
  leads_per_minute: 5,
  signup_per_hour: 3,
  feedback_per_minute: 20,
  track_per_minute: 120,
  auto_block_multiplier: 3,
  auto_block_hours: 24,
  backup_retention_days: 30,
  health_alerts_enabled: true,
};

/** המפתחות שהמנהל רשאי לערוך מה-UI (cron_secret לא ביניהם) */
export const EDITABLE_SETTING_KEYS = (
  Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>
).filter((k) => k !== "cron_secret");

const CACHE_MS = 30_000;
let cache: { at: number; value: AppSettings } | null = null;

function coerce(raw: Record<string, unknown>): AppSettings {
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>) {
    const def = DEFAULT_SETTINGS[key];
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (typeof def === "boolean") out[key] = v === true || v === "true";
    else if (typeof def === "number") {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n >= 0) out[key] = n;
    } else if (typeof v === "string") out[key] = v;
  }
  return out as AppSettings;
}

export async function getSettings(opts: { fresh?: boolean } = {}): Promise<AppSettings> {
  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("data")
      .eq("id", 1)
      .maybeSingle();
    const value = coerce((data?.data ?? {}) as Record<string, unknown>);
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("getSettings failed", e instanceof Error ? e.message : e);
    return cache?.value ?? DEFAULT_SETTINGS;
  }
}

export async function updateSettings(
  patch: Partial<AppSettings>,
  userId: string | null,
): Promise<AppSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const current = await getSettings({ fresh: true });
  const next: Record<string, unknown> = { ...current };
  for (const key of EDITABLE_SETTING_KEYS) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }
  const value = coerce(next);
  const { error } = await supabaseAdmin.from("app_settings").upsert({
    id: 1,
    data: value as never,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), value };
  return value;
}

/** הסוד למתזמן — נוצר במיגרציה; אם חסר (מסד ישן) נוצר כאן פעם אחת */
export async function getCronSecret(): Promise<string | null> {
  const s = await getSettings();
  if (s.cron_secret) return s.cron_secret;
  const envSecret = process.env["SCOUT_CRON_SECRET"];
  return envSecret && envSecret.trim() ? envSecret.trim() : null;
}
