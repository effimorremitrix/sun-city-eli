import { LOCALE_META, type Locale } from "@/lib/i18n";

/* ============================================================
 * תרגום אוטומטי של תוכן האתר (אדמין בלבד) — ממיר שדות טקסט
 * בעברית לשפת יעד באמצעות Anthropic Claude, באותה תשתית של
 * חיפוש ה‑AI (מפתח חיצוני + רישום שימוש).
 * ============================================================ */

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  ru: "Russian",
};

const systemPrompt = (target: Locale) =>
  `You are a professional translator for a real-estate agency website in Netanya, Israel.
Translate the given Hebrew marketing texts into ${LANGUAGE_NAMES[target] ?? target}.
Rules:
- Return JSON only, in the exact shape {"<key>": "<translation>", ...} with the same keys you received.
- Keep the tone natural and marketing-friendly for a real-estate audience.
- Keep numbers, prices, phone numbers and proper URLs unchanged.
- Transliterate Israeli street and neighborhood names; do not invent information.`;

/** מתרגם מילון שדות עברי לשפת יעד. מחזיר רק מפתחות שחזרו מהמודל. */
export async function translateFields(
  fields: Record<string, string>,
  target: Locale,
  userId: string | null = null,
): Promise<Record<string, string>> {
  const { AI_MODEL, logAiUsage } = await import("@/lib/ai-usage.server");
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    await logAiUsage({
      feature: "translate",
      model: AI_MODEL,
      status: "error",
      errorMessage: "missing ANTHROPIC_API_KEY",
      userId,
    });
    throw new Error("התרגום האוטומטי אינו זמין כרגע");
  }

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 3000,
        system: systemPrompt(target),
        messages: [{ role: "user", content: JSON.stringify(fields) }],
      }),
    });
  } catch (err) {
    await logAiUsage({
      feature: "translate",
      model: AI_MODEL,
      status: "error",
      errorMessage: String(err),
      userId,
    });
    throw new Error("התרגום האוטומטי נכשל. נסו שוב");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("translate failed", res.status, body);
    await logAiUsage({
      feature: "translate",
      model: AI_MODEL,
      status: "error",
      errorMessage: `HTTP ${res.status}`,
      userId,
    });
    if (res.status === 429) throw new Error("יותר מדי בקשות תרגום. נסו שוב בעוד רגע");
    throw new Error("התרגום האוטומטי נכשל. נסו שוב");
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  await logAiUsage({
    feature: "translate",
    model: AI_MODEL,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    status: "success",
    userId,
  });

  const raw = (json.content ?? [])
    .map((c) => c?.text ?? "")
    .join("")
    .trim();
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
  } catch {
    throw new Error("התרגום האוטומטי החזיר תשובה לא תקינה. נסו שוב");
  }

  // מחזירים רק מפתחות שנשלחו — בלי המצאות
  const out: Record<string, string> = {};
  for (const key of Object.keys(fields)) {
    const v = (parsed as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

export const isTranslateTarget = (v: string): v is Locale =>
  v !== "he" && Object.prototype.hasOwnProperty.call(LOCALE_META, v);
