/** סוכן סריקת נכסים ל-ADMIN — מחפש באינטרנט מודעות אמיתיות ומחזיר מועמדים עם קישור מקור */

export type ScoutProfile = {
  id: string;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  min_size: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  sources: string[];
  notes: string | null;
  is_active: boolean;
  last_run_at: string | null;
};

export type ScoutCandidate = {
  source_site: string;
  source_url: string;
  title: string;
  deal_type: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  neighborhood: string | null;
  address: string | null;
  raw_summary: string | null;
  match_score: number;
  match_reason: string | null;
};

/** דומיינים שמותר לקבל מהם מועמדים */
const ALLOWED_HOSTS: Record<string, string> = {
  "yad2.co.il": "יד2",
  "www.yad2.co.il": "יד2",
  "madlan.co.il": "מדלן",
  "www.madlan.co.il": "מדלן",
  "homeless.co.il": "הומלס",
  "www.homeless.co.il": "הומלס",
  "komo.co.il": "קומו",
  "www.komo.co.il": "קומו",
  "winwin.co.il": "וין וין",
  "www.winwin.co.il": "וין וין",
  "nadlan.gov.il": "רשות המיסים",
  "www.nadlan.gov.il": "רשות המיסים",
};

const SITE_QUERY: Record<string, string> = {
  yad2: "site:yad2.co.il",
  madlan: "site:madlan.co.il",
  homeless: "site:homeless.co.il",
  komo: "site:komo.co.il",
  winwin: "site:winwin.co.il",
};

const SYSTEM_PROMPT = `אתה סוכן איתור נכסים למשרד תיווך בנתניה. אתה מחפש באינטרנט מודעות נדל"ן אמיתיות בלבד.
כלל ברזל: אסור להמציא נכסים, מחירים, כתובות או קישורים. כל מועמד חייב להיות מבוסס על עמוד מודעה אמיתי שמצאת בחיפוש, עם כתובת URL מדויקת מתוצאות החיפוש.
אם שדה לא מופיע במקור — החזר null. אל תשלים ניחושים.
אם לא מצאת מודעות מתאימות — החזר רשימה ריקה.
החזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"candidates":[{"source_url":string,"title":string,"deal_type":"מכירה"|"השכרה"|null,"price":number|null,"rooms":number|null,"size_sqm":number|null,"neighborhood":string|null,"address":string|null,"summary":string|null,"match_score":number,"match_reason":string}]}
match_score הוא 0-100 להתאמה לקריטריונים, match_reason משפט קצר בעברית (עד 20 מילים) שמסביר למה הנכס מתאים.`;

function n(v: unknown): number | null {
  const x = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v;
  return typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null;
}

function s(v: unknown, max = 200): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** ניקוי קשיח: מועמד תקין רק אם יש לו URL אמיתי מדומיין מוכר וכותרת */
function sanitizeCandidates(raw: unknown, neighborhoods: string[]): ScoutCandidate[] {
  const list = Array.isArray((raw as { candidates?: unknown[] })?.candidates)
    ? ((raw as { candidates: unknown[] }).candidates as unknown[])
    : [];
  const out: ScoutCandidate[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const c = (item ?? {}) as Record<string, unknown>;
    const urlRaw = s(c["source_url"], 500);
    if (!urlRaw) continue;
    let url: URL;
    try {
      url = new URL(urlRaw);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const site = ALLOWED_HOSTS[url.hostname];
    if (!site) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);

    const title = s(c["title"], 160);
    if (!title) continue;

    const deal = c["deal_type"] === "מכירה" || c["deal_type"] === "השכרה" ? (c["deal_type"] as string) : null;
    const hood = s(c["neighborhood"], 80);
    const score = Math.max(0, Math.min(100, Math.round(Number(c["match_score"]) || 0)));

    out.push({
      source_site: site,
      source_url: url.href,
      title,
      deal_type: deal,
      price: n(c["price"]),
      rooms: n(c["rooms"]),
      size_sqm: n(c["size_sqm"]),
      neighborhood: hood && neighborhoods.includes(hood) ? hood : hood,
      address: s(c["address"], 160),
      raw_summary: s(c["summary"], 600),
      match_score: score,
      match_reason: s(c["match_reason"], 240),
    });
    if (out.length >= 12) break;
  }
  return out;
}

function buildUserPrompt(p: ScoutProfile): string {
  const parts: string[] = [];
  parts.push(`סוג עסקה: ${p.deal_type}`);
  parts.push(`עיר: ${p.city}`);
  if (p.neighborhoods.length) parts.push(`שכונות מועדפות: ${p.neighborhoods.join(", ")}`);
  if (p.min_price) parts.push(`מחיר מינימלי: ${p.min_price} ש"ח`);
  if (p.max_price) parts.push(`מחיר מקסימלי: ${p.max_price} ש"ח`);
  if (p.min_rooms) parts.push(`מינימום חדרים: ${p.min_rooms}`);
  if (p.min_size) parts.push(`מינימום מ"ר: ${p.min_size}`);
  const needs = [
    p.needs_mamad ? 'ממ"ד' : null,
    p.needs_elevator ? "מעלית" : null,
    p.needs_parking ? "חניה" : null,
    p.needs_balcony ? "מרפסת" : null,
  ].filter(Boolean);
  if (needs.length) parts.push(`חובה: ${needs.join(", ")}`);
  if (p.notes) parts.push(`הערות: ${p.notes}`);

  const sites = p.sources.map((x) => SITE_QUERY[x]).filter(Boolean).join(" OR ");
  const scope = sites ? `חפש בעיקר ב: ${sites}` : "חפש באתרי הנדל\"ן המרכזיים בישראל";

  return `${scope}
מצא מודעות נדל"ן עדכניות שמתאימות לקריטריונים הבאים:
${parts.join("\n")}

בצע כמה חיפושים לפי הצורך, ואז החזר JSON עם עד 10 מועמדים אמיתיים, כולל ה-URL המדויק של עמוד המודעה.`;
}

/** מריץ סריקת אינטרנט אמיתית עבור פרופיל אחד ומחזיר מועמדים מנוקים */
export async function scoutProfileCandidates(
  profile: ScoutProfile,
  neighborhoods: string[],
  userId: string | null = null,
): Promise<{ candidates: ScoutCandidate[]; searches: number }> {
  const { AI_MODEL, logAiUsage } = await import("@/lib/ai-usage.server");
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    await logAiUsage({ feature: "admin_scout", model: AI_MODEL, status: "error", errorMessage: "missing ANTHROPIC_API_KEY", userId });
    throw new Error("סוכן הסריקה אינו זמין כרגע (חסר מפתח API)");
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
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: buildUserPrompt(profile) }],
      }),
    });
  } catch (err) {
    await logAiUsage({ feature: "admin_scout", model: AI_MODEL, status: "error", errorMessage: String(err), userId });
    throw new Error("הסריקה נכשלה. נסו שוב בעוד רגע");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("scout failed", res.status, body);
    await logAiUsage({ feature: "admin_scout", model: AI_MODEL, status: "error", errorMessage: `HTTP ${res.status}`, userId });
    if (res.status === 429) throw new Error("יותר מדי בקשות לסוכן. נסו שוב בעוד רגע");
    if (res.status === 401 || res.status === 403) throw new Error("סוכן הסריקה אינו זמין כרגע");
    throw new Error("הסריקה נכשלה. נסו שוב בעוד רגע");
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } };
  };

  await logAiUsage({
    feature: "admin_scout",
    model: AI_MODEL,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    status: "success",
    userId,
  });

  const text = (json.content ?? [])
    .filter((c) => c?.type === "text" || typeof c?.text === "string")
    .map((c) => c?.text ?? "")
    .join("\n")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  } catch {
    parsed = {};
  }

  return {
    candidates: sanitizeCandidates(parsed, neighborhoods),
    searches: json.usage?.server_tool_use?.web_search_requests ?? 0,
  };
}
