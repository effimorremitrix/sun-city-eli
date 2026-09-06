import { clientIp, deviceId, currentRequest } from "@/lib/request-context.server";
import { getSettings } from "@/lib/settings.server";
import { logActivity } from "@/lib/activity.server";

/**
 * מגבלות קצב ומכסות מבוססות DB (rate_limits + consume_rate_limit) — שורדות
 * ב-Cloudflare Workers, בניגוד ל-Map בזיכרון של מופע אחד. כל פעולה ציבורית
 * שעולה כסף או מייצרת רשומות עוברת כאן: לפי IP, לפי מזהה מכשיר (קוקי)
 * ולפי משתמש מחובר. חריגה של פי-N מהמכסה חוסמת את המפתח אוטומטית.
 */

export type LimitRule = { limit: number; windowSeconds: number; label: string };

export type LimitScope = {
  /** שם הפעולה — חלק מהמפתח (ai_search / lead / signup / feedback / profile) */
  scope: string;
  userId?: string | null;
  ip?: LimitRule | null;
  device?: LimitRule | null;
  user?: LimitRule | null;
  /** לוג לאירועי חסימה/חריגה (ברירת מחדל: כן) */
  log?: boolean;
};

export type LimitResult =
  | { allowed: true; remaining: number | null }
  | { allowed: false; reason: "blocked" | "limit"; label: string; retryAfterSeconds: number };

const DAY = 24 * 60 * 60;

export const daily = (limit: number, label: string): LimitRule => ({
  limit,
  windowSeconds: DAY,
  label,
});
export const perMinute = (limit: number, label: string): LimitRule => ({
  limit,
  windowSeconds: 60,
  label,
});
export const perHour = (limit: number, label: string): LimitRule => ({
  limit,
  windowSeconds: 3600,
  label,
});

/** המפתחות שמזהים את הקורא הנוכחי (IP תמיד; מכשיר ומשתמש כשקיימים) */
export function callerKeys(scope: string, userId?: string | null) {
  const req = currentRequest();
  const ip = clientIp(req);
  const did = deviceId(req);
  return {
    ip: `${scope}:ip:${ip}`,
    device: did ? `${scope}:dev:${did}` : null,
    user: userId ? `${scope}:user:${userId}` : null,
    rawIp: ip,
    rawDevice: did,
  };
}

export async function enforceLimits(input: LimitScope): Promise<LimitResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await getSettings();
  const keys = callerKeys(input.scope, input.userId);
  const checks: Array<{ key: string; rule: LimitRule }> = [];
  if (input.ip) checks.push({ key: keys.ip, rule: input.ip });
  if (input.device && keys.device) checks.push({ key: keys.device, rule: input.device });
  if (input.user && keys.user) checks.push({ key: keys.user, rule: input.user });
  if (!checks.length) return { allowed: true, remaining: null };

  // חסימות פעילות
  try {
    const { data: blocked } = await supabaseAdmin
      .from("blocked_keys")
      .select("key, until")
      .in(
        "key",
        checks.map((c) => c.key),
      )
      .gt("until", new Date().toISOString())
      .limit(1);
    if (blocked?.length) {
      const until = new Date(blocked[0]!.until).getTime();
      return {
        allowed: false,
        reason: "blocked",
        label: "blocked",
        retryAfterSeconds: Math.max(60, Math.round((until - Date.now()) / 1000)),
      };
    }
  } catch (e) {
    console.error("blocked_keys lookup failed", e instanceof Error ? e.message : e);
  }

  let remaining: number | null = null;
  for (const { key, rule } of checks) {
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      // כשל במסד לא חוסם לקוח אמיתי — אבל נרשם
      console.error("consume_rate_limit failed", error.message);
      continue;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      { allowed: boolean; remaining: number; current_count: number } | undefined;
    if (!row) continue;
    remaining = remaining == null ? row.remaining : Math.min(remaining, row.remaining);
    if (!row.allowed) {
      const multiplier = Math.max(1.5, settings.auto_block_multiplier || 3);
      if (row.current_count >= rule.limit * multiplier) {
        const until = new Date(Date.now() + (settings.auto_block_hours || 24) * 3600_000);
        await supabaseAdmin.from("blocked_keys").upsert({
          key,
          reason: `${input.scope}: ${row.current_count} / ${rule.limit}`,
          until: until.toISOString(),
          hits: row.current_count,
        });
        if (input.log !== false) {
          await logActivity({
            kind: "security",
            event: "auto_block",
            status: "blocked",
            message: `נחסם ${key} (${row.current_count} בקשות מול מכסה ${rule.limit})`,
            metadata: { scope: input.scope, key, count: row.current_count, limit: rule.limit },
          });
        }
      } else if (input.log !== false) {
        await logActivity({
          kind: "security",
          event: "rate_limited",
          status: "blocked",
          message: `${input.scope}: חריגה ממכסה ${rule.label}`,
          metadata: { scope: input.scope, key, count: row.current_count, limit: rule.limit },
        });
      }
      return {
        allowed: false,
        reason: "limit",
        label: rule.label,
        retryAfterSeconds: rule.windowSeconds,
      };
    }
  }
  return { allowed: true, remaining };
}

/** מכסות חיפוש ה-AI לפי ההגדרות: פרץ לדקה + יומי לפי מכשיר/IP או משתמש */
export async function enforceAiSearchLimits(userId: string | null): Promise<LimitResult> {
  const s = await getSettings();
  if (!s.ai_search_enabled) {
    return { allowed: false, reason: "limit", label: "disabled", retryAfterSeconds: 3600 };
  }
  const burst = perMinute(s.ai_search_burst_per_minute, "burst");
  if (userId) {
    return enforceLimits({
      scope: "ai_search",
      userId,
      ip: perMinute(Math.max(burst.limit * 3, 10), "burst"),
      user: daily(s.ai_search_user_daily, "daily"),
    });
  }
  return enforceLimits({
    scope: "ai_search",
    ip: daily(s.ai_search_anon_daily * 3, "daily"),
    device: daily(s.ai_search_anon_daily, "daily"),
  });
}

/** סכום עלות ה-AI היום מול התקרה היומית (דולר) */
export async function aiSpendCapReached(): Promise<{
  reached: boolean;
  spent: number;
  cap: number;
}> {
  const s = await getSettings();
  const cap = s.ai_daily_usd_cap;
  if (!cap || cap <= 0) return { reached: false, spent: 0, cap: 0 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { data } = await supabaseAdmin
      .from("ai_usage_events")
      .select("cost_usd")
      .gte("created_at", start.toISOString())
      .limit(5000);
    const spent = (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
    return { reached: spent >= cap, spent, cap };
  } catch {
    return { reached: false, spent: 0, cap };
  }
}
