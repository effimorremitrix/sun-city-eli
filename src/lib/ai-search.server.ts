import type { ListingFilters } from "@/lib/listings";

const SYSTEM_PROMPT = `אתה עוזר חיפוש נכסים של משרד תיווך בנתניה. תפקידך להמיר בקשה חופשית בעברית לפילטרים מובנים.
כלל ברזל: אסור להמציא נכסים, מחירים או שכונות. אתה מחזיר פילטרים בלבד + משפט הסבר קצר בעברית (עד 25 מילים).
החזר JSON בלבד במבנה:
{"filters":{"deal_type":"מכירה"|"השכרה"|null,"neighborhoods":string[],"min_price":number|null,"max_price":number|null,"min_rooms":number|null,"min_size":number|null,"needs_mamad":boolean,"needs_elevator":boolean,"needs_parking":boolean,"needs_balcony":boolean},"explanation":string}
אם משהו לא נאמר במפורש — השאר null או false. "קרוב לים" אינו פילטר; התעלם ממנו בפילטרים ורק הזכר בהסבר.`;

export type AiFilterResult = { filters: ListingFilters; explanation: string };

const ALLOWED_DEALS = ["מכירה", "השכרה"];

function sanitize(raw: unknown, neighborhoods: string[]): AiFilterResult {
  const obj = (raw ?? {}) as { filters?: Record<string, unknown>; explanation?: unknown };
  const f = (obj.filters ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
  };
  const deal = typeof f["deal_type"] === "string" && ALLOWED_DEALS.includes(f["deal_type"]) ? (f["deal_type"] as string) : null;
  const rawHoods = Array.isArray(f["neighborhoods"]) ? (f["neighborhoods"] as unknown[]) : [];
  const hoods = rawHoods
    .filter((h): h is string => typeof h === "string")
    .filter((h) => neighborhoods.includes(h))
    .slice(0, 10);

  return {
    filters: {
      deal_type: deal,
      neighborhoods: hoods,
      min_price: num(f["min_price"]),
      max_price: num(f["max_price"]),
      min_rooms: num(f["min_rooms"]),
      min_size: num(f["min_size"]),
      needs_mamad: f["needs_mamad"] === true,
      needs_elevator: f["needs_elevator"] === true,
      needs_parking: f["needs_parking"] === true,
      needs_balcony: f["needs_balcony"] === true,
    },
    explanation: typeof obj.explanation === "string" ? obj.explanation.slice(0, 240) : "",
  };
}

/** ממיר טקסט חופשי לפילטרים מובנים באמצעות Anthropic Claude (מפתח חיצוני של בעל האתר) */
export async function extractFilters(
  query: string,
  neighborhoods: string[],
  userId: string | null = null,
): Promise<AiFilterResult> {
  const { AI_MODEL, logAiUsage } = await import("@/lib/ai-usage.server");
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    await logAiUsage({ model: AI_MODEL, status: "error", errorMessage: "missing ANTHROPIC_API_KEY", userId });
    throw new Error("חיפוש ה‑AI אינו זמין כרגע");
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
        max_tokens: 600,
        system: `${SYSTEM_PROMPT}\nשכונות מותרות: ${neighborhoods.join(", ")}`,
        messages: [{ role: "user", content: query }],
      }),
    });
  } catch (err) {
    await logAiUsage({ model: AI_MODEL, status: "error", errorMessage: String(err), userId });
    throw new Error("החיפוש החכם נכשל. נסו שוב או השתמשו בסינון הרגיל");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("ai search failed", res.status, body);
    await logAiUsage({ model: AI_MODEL, status: "error", errorMessage: `HTTP ${res.status}`, userId });
    if (res.status === 429) throw new Error("יותר מדי בקשות חיפוש. נסו שוב בעוד רגע");
    if (res.status === 401 || res.status === 403) throw new Error("חיפוש ה‑AI אינו זמין כרגע");
    throw new Error("החיפוש החכם נכשל. נסו שוב או השתמשו בסינון הרגיל");
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  await logAiUsage({
    model: AI_MODEL,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    status: "success",
    userId,
  });

  const raw = (json.content ?? []).map((c) => c?.text ?? "").join("").trim();
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
  } catch {
    parsed = {};
  }
  return sanitize(parsed, neighborhoods);
}

