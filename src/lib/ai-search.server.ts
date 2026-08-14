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

/** ממיר טקסט חופשי לפילטרים מובנים באמצעות Lovable AI */
export async function extractFilters(query: string, neighborhoods: string[]): Promise<AiFilterResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("חיפוש ה‑AI אינו זמין כרגע");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\nשכונות מותרות: ${neighborhoods.join(", ")}` },
        { role: "user", content: query },
      ],
    }),
  });

  if (res.status === 429) throw new Error("יותר מדי בקשות חיפוש. נסו שוב בעוד רגע");
  if (!res.ok) {
    console.error("ai search failed", res.status, await res.text().catch(() => ""));
    throw new Error("החיפוש החכם נכשל. נסו שוב או השתמשו בסינון הרגיל");
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }
  return sanitize(parsed, neighborhoods);
}
