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
        max_tokens: 6000,
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

/* ============================================================
 * תרגום אוטומטי בשמירה — לכל שלוש שפות האתר, עם זיכרון של המקור.
 *
 * מבנה האחסון: לכל שפה אובייקט שטוח של שדות מתורגמים, ובתוכו מפה `_hash`
 * שמחזיקה, לכל שדה, חתימת FNV-1a של הטקסט העברי שממנו נוצר התרגום:
 *   { en: { title: "…", description: "…", _hash: { title: "a1b2c3d4", … } } }
 *
 * הכללים לכל שדה בכל שפה:
 *   - התרגום ריק                       → מתרגמים.
 *   - יש תרגום אבל אין חתימה           → תרגום ידני ישן: שומרים ומחתימים בעברית הנוכחית.
 *   - יש תרגום והחתימה זהה לעברית      → המקור לא השתנה: שומרים כמות שהוא.
 *   - יש תרגום והחתימה שונה מהעברית    → המקור השתנה: מתרגמים מחדש.
 * כך עריכה ידנית (AdminTranslateTabs) מנצחת, ועדכון של העברית מרענן אותה.
 * ============================================================ */

export const AUTO_TRANSLATE_TARGETS = ["en", "fr", "ru"] as const;
export type AutoTranslateTarget = (typeof AUTO_TRANSLATE_TARGETS)[number];

/** אובייקט תרגומים של שפה אחת: שדות טקסט + מפת החתימות */
export type TranslatedFields = { [field: string]: string | Record<string, string> | undefined } & {
  _hash?: Record<string, string>;
};

export type AutoTranslations = Record<AutoTranslateTarget, TranslatedFields>;

/** חתימת FNV-1a (32 סיביות, hex) של טקסט — קצרה, דטרמיניסטית, בלי תלויות */
export const fnv1a = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

/** חתימת שדה עברי — על הטקסט המנורמל (רווחים בקצוות לא נחשבים שינוי) */
export const sourceHash = (text: string): string => fnv1a(text.trim());

/** תקרת טקסט לקריאה אחת למודל — מעבר לזה מפצלים לכמה קריאות */
const MAX_CHARS_PER_CALL = 6000;
const MAX_KEYS_PER_CALL = 30;

/** מפצל מילון שדות לקבוצות שכל אחת נכנסת בנוחות לקריאה אחת */
const chunkFields = (fields: Record<string, string>): Record<string, string>[] => {
  const chunks: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let chars = 0;
  let keys = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (keys > 0 && (chars + value.length > MAX_CHARS_PER_CALL || keys >= MAX_KEYS_PER_CALL)) {
      chunks.push(current);
      current = {};
      chars = 0;
      keys = 0;
    }
    current[key] = value;
    chars += value.length;
    keys += 1;
  }
  if (keys > 0) chunks.push(current);
  return chunks;
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * מתרגם שדות עבריים לכל שפות האתר, רק היכן שצריך (ראו הכללים למעלה).
 * לעולם לא זורק: כשל ברשת/במודל, או חוסר במפתח API, מחזירים את הקיים
 * (עם חתימות לשדות ידניים) — השמירה של התוכן העברי לא תלויה בתרגום.
 */
export async function autoTranslate(
  fields: Record<string, string>,
  existing: Partial<Record<string, TranslatedFields | Record<string, unknown> | undefined>> | undefined,
  userId: string | null = null,
): Promise<AutoTranslations> {
  // רק שדות עם טקסט עברי — שדה ריק לא מתורגם ולא נשמר
  const source: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim()) source[key] = value.trim();
  }
  const hashes = Object.fromEntries(Object.entries(source).map(([k, v]) => [k, sourceHash(v)]));

  const result = {} as AutoTranslations;
  const pending: Record<AutoTranslateTarget, Record<string, string>> = { en: {}, fr: {}, ru: {} };

  for (const lang of AUTO_TRANSLATE_TARGETS) {
    const prev = (existing?.[lang] ?? {}) as Record<string, unknown>;
    const prevHash =
      prev["_hash"] && typeof prev["_hash"] === "object"
        ? (prev["_hash"] as Record<string, string>)
        : {};
    const out: TranslatedFields = {};
    const outHash: Record<string, string> = {};
    for (const key of Object.keys(source)) {
      const value = asString(prev[key]).trim();
      const stamped = prevHash[key];
      if (!value) {
        pending[lang][key] = source[key]!;
      } else if (!stamped) {
        // תרגום ידני שנשמר לפני מנגנון החתימות — שומרים ומחתימים
        out[key] = value;
        outHash[key] = hashes[key]!;
      } else if (stamped === hashes[key]) {
        out[key] = value;
        outHash[key] = stamped;
      } else {
        pending[lang][key] = source[key]!;
      }
    }
    if (Object.keys(outHash).length) out._hash = outHash;
    result[lang] = out;
  }

  const hasPending = AUTO_TRANSLATE_TARGETS.some((l) => Object.keys(pending[l]).length > 0);
  if (!hasPending) return result;

  if (!process.env["ANTHROPIC_API_KEY"]) {
    // בלי מפתח — התוכן העברי נשמר, התרגומים יושלמו כשהמפתח יוגדר
    for (const lang of AUTO_TRANSLATE_TARGETS) keepUntranslated(result[lang], existing?.[lang], pending[lang]);
    return result;
  }

  await Promise.all(
    AUTO_TRANSLATE_TARGETS.map(async (lang) => {
      const todo = pending[lang];
      if (!Object.keys(todo).length) return;
      const translated: Record<string, string> = {};
      try {
        for (const chunk of chunkFields(todo)) {
          Object.assign(translated, await translateFields(chunk, lang, userId));
        }
      } catch (e) {
        console.error("autoTranslate failed", lang, e instanceof Error ? e.message : e);
      }
      const out = result[lang];
      const outHash = out._hash ?? {};
      for (const key of Object.keys(todo)) {
        const text = translated[key];
        if (text) {
          out[key] = text;
          outHash[key] = hashes[key]!;
        }
      }
      // שדות שלא חזרו מהמודל — משאירים את התרגום הישן (אם היה) ולא מחתימים,
      // כך שהניסיון הבא יתרגם שוב
      keepUntranslated(out, existing?.[lang], todo, translated);
      if (Object.keys(outHash).length) out._hash = outHash;
      else delete out._hash;
    }),
  );

  return result;
}

/** שדות שנכשל תרגומם: משאירים את הערך הישן (בלי חתימה) כדי לא לאבד אותו */
function keepUntranslated(
  out: TranslatedFields,
  prev: Record<string, unknown> | undefined,
  todo: Record<string, string>,
  translated: Record<string, string> = {},
) {
  for (const key of Object.keys(todo)) {
    if (translated[key]) continue;
    const old = asString(prev?.[key]).trim();
    if (old) out[key] = old;
  }
}

/* ------------- עזרי שיטוח למבני תוכן מקוננים (site_content) ------------- */

/**
 * ממיר אובייקט תרגומים שטוח ("faq.<id>.q") למבנה המקונן של site_content:
 * { business: {bio}, testimonials: {<id>: {…}}, faq: {<id>: {…}}, _hash }.
 */
export function nestTranslatedFields(flat: TranslatedFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (key === "_hash") {
      if (value && typeof value === "object" && Object.keys(value).length) out["_hash"] = value;
      continue;
    }
    if (typeof value !== "string" || !value) continue;
    const parts = key.split(".");
    let node = out;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      if (!next || typeof next !== "object") node[part] = {};
      node = node[part] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]!] = value;
  }
  return out;
}

/** ההפך: מהמבנה המקונן של site_content לשטוח, לצורך השוואה ב-autoTranslate */
export function flattenTranslatedFields(
  nested: Record<string, unknown> | undefined,
  keys: string[],
): TranslatedFields {
  const out: TranslatedFields = {};
  for (const key of keys) {
    let node: unknown = nested;
    for (const part of key.split(".")) {
      if (!node || typeof node !== "object") {
        node = undefined;
        break;
      }
      node = (node as Record<string, unknown>)[part];
    }
    if (typeof node === "string" && node) out[key] = node;
  }
  const hash = nested?.["_hash"];
  if (hash && typeof hash === "object") out._hash = hash as Record<string, string>;
  return out;
}
