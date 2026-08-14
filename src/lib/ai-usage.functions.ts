import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UsageDay = { date: string; requests: number; input_tokens: number; output_tokens: number; cost_usd: number };
export type UsageModel = { model: string; requests: number; input_tokens: number; output_tokens: number; cost_usd: number };
export type UsageEventRow = {
  id: string;
  created_at: string;
  model: string;
  feature: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: string;
  error_message: string | null;
  user_email: string | null;
};
export type UsageReport = {
  from: string;
  to: string;
  totals: { requests: number; errors: number; input_tokens: number; output_tokens: number; cost_usd: number };
  days: UsageDay[];
  models: UsageModel[];
  recent: UsageEventRow[];
};

const RANGES = ["7d", "30d", "month"] as const;
export type UsageRange = (typeof RANGES)[number];

function rangeStart(range: UsageRange): Date {
  const now = new Date();
  if (range === "month") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const days = range === "7d" ? 7 : 30;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** דוח שימוש בסוכן ה‑AI — למנהל בלבד */
export const adminAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { range?: string } | undefined) => {
    const raw = String(input?.range ?? "30d");
    const range = (RANGES as readonly string[]).includes(raw) ? (raw as UsageRange) : "30d";
    return { range };
  })
  .handler(async ({ data, context }): Promise<UsageReport> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const from = rangeStart(data.range);
    const to = new Date();

    const { data: rows, error } = await context.supabase
      .from("ai_usage_events")
      .select("id, created_at, model, feature, input_tokens, output_tokens, cost_usd, status, error_message, user_id")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const events = (rows ?? []) as Array<Record<string, any>>;

    const totals = { requests: 0, errors: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    const dayMap = new Map<string, UsageDay>();
    const modelMap = new Map<string, UsageModel>();

    for (const e of events) {
      const inTok = Number(e["input_tokens"] ?? 0);
      const outTok = Number(e["output_tokens"] ?? 0);
      const cost = Number(e["cost_usd"] ?? 0);
      totals.requests += 1;
      if (e["status"] !== "success") totals.errors += 1;
      totals.input_tokens += inTok;
      totals.output_tokens += outTok;
      totals.cost_usd += cost;

      const day = String(e["created_at"]).slice(0, 10);
      const d = dayMap.get(day) ?? { date: day, requests: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      d.requests += 1;
      d.input_tokens += inTok;
      d.output_tokens += outTok;
      d.cost_usd += cost;
      dayMap.set(day, d);

      const model = String(e["model"] ?? "");
      const m = modelMap.get(model) ?? { model, requests: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      m.requests += 1;
      m.input_tokens += inTok;
      m.output_tokens += outTok;
      m.cost_usd += cost;
      modelMap.set(model, m);
    }

    // השלמת ימים חסרים כדי שהגרף יהיה רציף
    const days: UsageDay[] = [];
    for (const cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const key = cursor.toISOString().slice(0, 10);
      days.push(dayMap.get(key) ?? { date: key, requests: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 });
    }

    const recentRaw = events.slice(0, 50);
    const userIds = [...new Set(recentRaw.map((e) => e["user_id"]).filter((v): v is string => !!v))];
    const emails = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profiles } = await context.supabase.from("profiles").select("id, email").in("id", userIds);
      for (const p of (profiles ?? []) as Array<{ id: string; email: string | null }>) emails.set(p.id, p.email);
    }

    const recent: UsageEventRow[] = recentRaw.map((e) => ({
      id: String(e["id"]),
      created_at: String(e["created_at"]),
      model: String(e["model"] ?? ""),
      feature: String(e["feature"] ?? ""),
      input_tokens: Number(e["input_tokens"] ?? 0),
      output_tokens: Number(e["output_tokens"] ?? 0),
      cost_usd: Number(e["cost_usd"] ?? 0),
      status: String(e["status"] ?? ""),
      error_message: (e["error_message"] as string | null) ?? null,
      user_email: e["user_id"] ? (emails.get(e["user_id"] as string) ?? null) : null,
    }));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totals: { ...totals, cost_usd: Math.round(totals.cost_usd * 1_000_000) / 1_000_000 },
      days,
      models: [...modelMap.values()].sort((a, b) => b.requests - a.requests),
      recent,
    };
  });
