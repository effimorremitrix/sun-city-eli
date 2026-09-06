/** מחירון טוקנים (דולר למיליון טוקנים) לפי מודלים של Anthropic */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-opus-4-5": { input: 5, output: 25 },
  "claude-opus-5": { input: 5, output: 25 },
};

/** המודלים שהמנהל יכול לבחור בטאב ההגדרות (מחיר לכל מיליון טוקנים) */
export const SELECTABLE_MODELS = Object.keys(PRICING);

export const AI_MODEL = "claude-sonnet-4-5";

/** עלות מוערכת בדולר לפי מחירון המודל */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-5"]!;
  const usd = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export type UsageEvent = {
  feature?: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  status?: "success" | "error";
  errorMessage?: string | null;
  userId?: string | null;
};

/** רושם אירוע שימוש ב‑AI. לא זורק שגיאה כדי לא להפיל את הבקשה עצמה */
export async function logAiUsage(e: UsageEvent): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inputTokens = Math.max(0, Math.round(e.inputTokens ?? 0));
    const outputTokens = Math.max(0, Math.round(e.outputTokens ?? 0));
    await supabaseAdmin.from("ai_usage_events").insert({
      feature: e.feature ?? "ai_search",
      model: e.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: estimateCost(e.model, inputTokens, outputTokens),
      status: e.status ?? "success",
      error_message: e.errorMessage ? String(e.errorMessage).slice(0, 300) : null,
      user_id: e.userId ?? null,
    });
  } catch (err) {
    console.error("logAiUsage failed", err);
  }
}
