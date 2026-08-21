/**
 * סוכן סריקת נכסים ל-ADMIN — מחזיר מועמדים אמיתיים עם קישור מקור.
 *
 * שני מסלולים:
 * 1. לוחות שאפשר לסרוק ישירות (יד2, קומו) — קריאה ל-API/לעמודי החיפוש שלהם,
 *    עם עימוד מלא. זה המסלול שמחזיר את *כל* התוצאות שהלוח מציג.
 * 2. לוחות שחוסמים סריקה אוטומטית (מדלן, הומלס, וין וין, פייסבוק) — חיפוש
 *    אינטרנט של Claude, שמוצא רק מה שמנועי החיפוש הספיקו לאנדקס.
 */

import { normalizeHebrew } from "@/lib/yad2.server";

export type ScoutProfile = {
  id: string;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  max_rooms: number | null;
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
  /* מתקנים כפי שדווחו במודעה — null: המודעה לא ציינה */
  has_mamad: boolean | null;
  has_elevator: boolean | null;
  has_parking: boolean | null;
  has_balcony: boolean | null;
  raw_summary: string | null;
  match_score: number;
  match_reason: string | null;
};

/** רף ציון התאמה — מועמד מתחתיו נפסל (רשת ביטחון מעל הסינון הקשיח) */
export const MIN_MATCH_SCORE = 60;

/**
 * המארח כפי שהוא מופיע במפות שלמטה — בלי תחיליות www/m. תוצאות אמיתיות
 * מגיעות גם מהאתר הנייד (למשל m.homeless.co.il), ולכן כל בדיקת מארח עוברת
 * דרך הנרמול הזה.
 */
const bareHost = (hostname: string) => hostname.replace(/^(www\.|m\.)/, "");

/** דומיינים שמותר לקבל מהם מועמדים (מארח מנורמל → שם האתר בעברית) */
const ALLOWED_HOSTS: Record<string, string> = {
  "yad2.co.il": "יד2",
  "madlan.co.il": "מדלן",
  "homeless.co.il": "הומלס",
  "komo.co.il": "קומו",
  "winwin.co.il": "וין וין",
  "nadlan.gov.il": "רשות המיסים",
  "facebook.com": "פייסבוק",
  "instagram.com": "אינסטגרם",
};

/** המקורות שנבחרים בפרופיל → הדומיינים שלהם (מארח מנורמל) */
const SOURCE_HOSTS: Record<string, string[]> = {
  yad2: ["yad2.co.il"],
  madlan: ["madlan.co.il"],
  homeless: ["homeless.co.il"],
  komo: ["komo.co.il"],
  winwin: ["winwin.co.il"],
  facebook: ["facebook.com"],
  instagram: ["instagram.com"],
};

const SITE_QUERY: Record<string, string> = {
  yad2: "site:yad2.co.il",
  madlan: "site:madlan.co.il",
  homeless: "site:homeless.co.il",
  komo: "site:komo.co.il",
  winwin: "site:winwin.co.il",
  // מיטב-המאמץ: רק פוסטים ציבוריים שמאונדקסים במנועי חיפוש (רוב הקבוצות סגורות)
  facebook: "site:facebook.com/groups OR site:facebook.com/marketplace",
  instagram: "site:instagram.com",
};

/** הדומיינים שאליהם מוגבלת הסריקה של הפרופיל — ריק = בלי הגבלה */
export function profileHosts(sources: string[]): string[] {
  const hosts = new Set<string>();
  for (const s of sources) for (const h of SOURCE_HOSTS[s] ?? []) hosts.add(h);
  return [...hosts];
}

/**
 * זיהוי עמוד מודעה בודדת (ולא עמוד תוצאות חיפוש/רשימה) — פר אתר.
 * מודעה שנפסלת כאן היא כמעט תמיד קישור כללי לעמוד חיפוש.
 */
const AD_PATH_RE: Record<string, RegExp> = {
  "yad2.co.il": /\/(realestate\/item|item)\//,
  "madlan.co.il": /\/(listings|bulletin|לוח)\//,
  // הומלס: עמוד מודעה הוא /sale/viewad,123456.aspx (וגם באתר הנייד)
  "homeless.co.il": /(viewad|details|item|prop)/i,
  "komo.co.il": /(ad|item|מודעה)/i,
  "winwin.co.il": /(item|ad|prop)/i,
  "facebook.com": /\/(groups\/[^/]+\/(posts|permalink)|marketplace\/item)\//,
  "instagram.com": /\/(p|reel)\//,
};

const SEARCH_PAGE_RE = /(\/search|[?&]q=|\/map\b|\/realestate\/(forsale|rent)([/?#]|$))/i;

/** האם ה-URL נראה כעמוד מודעה בודדת ולא עמוד תוצאות חיפוש */
function looksLikeAdPage(url: URL): boolean {
  const path = url.pathname + url.search;
  if (url.pathname === "/" || url.pathname === "") return false;
  if (SEARCH_PAGE_RE.test(path)) return false;
  const re = AD_PATH_RE[bareHost(url.hostname)];
  // אתר בלי תבנית מוכרת: מסתפקים בכך שאינו עמוד חיפוש
  return re ? re.test(path) : true;
}

/**
 * אימות HTTP עדין: פוסלים רק עמודים שמתו (404/410). חסימות בוטים (403/429)
 * וטיימאאוטים אינם פוסלים — יד2 ומדלן חוסמים בקשות אוטומטיות באופן קבוע.
 */
async function verifyCandidateUrl(url: string): Promise<"ok" | "gone" | "blocked"> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "accept-language": "he-IL,he;q=0.9",
      },
    });
    clearTimeout(timer);
    if (res.status === 404 || res.status === 410) return "gone";
    if (res.ok) return "ok";
    return "blocked";
  } catch {
    return "blocked";
  }
}

const SYSTEM_PROMPT = `אתה סוכן איתור נכסים למשרד תיווך בנתניה. אתה מחפש באינטרנט מודעות נדל"ן אמיתיות בלבד.
כלל ברזל: אסור להמציא נכסים, מחירים, כתובות או קישורים. כל מועמד חייב להיות מבוסס על עמוד מודעה אמיתי שמצאת בחיפוש, עם כתובת URL מדויקת מתוצאות החיפוש.
ה-source_url חייב להיות עמוד המודעה הבודדת עצמה — העתק אותו מתוצאת החיפוש בדיוק כפי שהופיע. אסור להחזיר עמוד תוצאות חיפוש, עמוד קטגוריה או עמוד מפה. מועמד שאין לו קישור ישיר למודעה — אל תכלול אותו.
אם שדה לא מופיע במקור — החזר null. אל תשלים ניחושים.
אם לא מצאת מודעות מתאימות — החזר רשימה ריקה.
החזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"candidates":[{"source_url":string,"title":string,"deal_type":"מכירה"|"השכרה"|null,"price":number|null,"rooms":number|null,"size_sqm":number|null,"neighborhood":string|null,"address":string|null,"has_mamad":boolean|null,"has_elevator":boolean|null,"has_parking":boolean|null,"has_balcony":boolean|null,"summary":string|null,"match_score":number,"match_reason":string}]}
דווח ממ"ד/מעלית/חניה/מרפסת רק אם המודעה מציינת זאת במפורש — אחרת null.
match_score הוא 0-100 להתאמה לקריטריונים, match_reason משפט קצר בעברית (עד 20 מילים) שמסביר למה הנכס מתאים.`;

function n(v: unknown): number | null {
  const x = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v;
  return typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null;
}

function s(v: unknown, max = 200): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** ערך בוליאני מהמודל — רק true/false מפורשים, כל השאר null ("לא צוין") */
function b(v: unknown): boolean | null {
  return v === true ? true : v === false ? false : null;
}

/**
 * התאמת שכונות סובלנית-לכתיב: שוויון או הכלה לאחד הכיוונים, אחרי נרמול
 * כתיב מלא/חסר — באתר שלנו "קריית השרון" ובלוחות "קרית השרון".
 */
const hoodMatches = (hood: string, list: string[]): boolean => {
  const normalized = normalizeHebrew(hood);
  return list.some((raw) => {
    const h = normalizeHebrew(raw);
    return normalized === h || normalized.includes(h) || h.includes(normalized);
  });
};

/**
 * הסינון הקשיח: מחזיר סיבת פסילה בעברית, או null כשהמועמד עומד בכל
 * קריטריוני הפרופיל. המדיניות: סתירה מפורשת פוסלת; קריטריון מספרי שהוגדר
 * (מחיר/חדרים/מ"ר) דורש ערך ידוע במודעה — ערך חסר פוסל; מתקן לא מדווח
 * (null) או שכונה שאינה מזוהה בטקסט — לא פוסלים (אין לאשש היעדר).
 */
export function hardCriteriaViolation(
  c: ScoutCandidate,
  p: ScoutProfile,
  allNeighborhoods: string[],
): string | null {
  if (c.match_score < MIN_MATCH_SCORE) return `ציון התאמה ${c.match_score} מתחת לרף`;
  if (c.deal_type && c.deal_type !== p.deal_type) {
    return `סוג עסקה ${c.deal_type} במקום ${p.deal_type}`;
  }
  if (p.min_rooms != null && (c.rooms == null || c.rooms < p.min_rooms)) {
    return c.rooms == null ? "מספר החדרים לא צוין" : `${c.rooms} חדרים — פחות מהנדרש`;
  }
  if (p.max_rooms != null && (c.rooms == null || c.rooms > p.max_rooms)) {
    return c.rooms == null ? "מספר החדרים לא צוין" : `${c.rooms} חדרים — יותר מהנדרש`;
  }
  if (p.min_price != null && (c.price == null || c.price < p.min_price)) {
    return c.price == null ? "המחיר לא צוין" : "המחיר נמוך מהמינימום";
  }
  if (p.max_price != null && (c.price == null || c.price > p.max_price)) {
    return c.price == null ? "המחיר לא צוין" : "המחיר גבוה מהמקסימום";
  }
  if (p.min_size != null && (c.size_sqm == null || c.size_sqm < p.min_size)) {
    return c.size_sqm == null ? 'שטח המ"ר לא צוין' : "השטח קטן מהנדרש";
  }
  const amenities: Array<[boolean, boolean | null, string]> = [
    [p.needs_mamad, c.has_mamad, 'ממ"ד'],
    [p.needs_elevator, c.has_elevator, "מעלית"],
    [p.needs_parking, c.has_parking, "חניה"],
    [p.needs_balcony, c.has_balcony, "מרפסת"],
  ];
  for (const [needed, has, label] of amenities) {
    if (needed && has === false) return `אין ${label} לפי המודעה`;
  }
  if (p.neighborhoods.length && c.neighborhood) {
    if (!hoodMatches(c.neighborhood, p.neighborhoods)) {
      // פוסלים רק שכונה שמזוהה בוודאות כשכונה קנונית אחרת; טקסט חופשי
      // לא מזוהה (וריאנט כתיב, תת-אזור) לא פוסל
      if (hoodMatches(c.neighborhood, allNeighborhoods)) {
        return `שכונה ${c.neighborhood} מחוץ לרשימת הפרופיל`;
      }
    }
  }
  return null;
}

/** מודעה שנפסלה בסינון — נאסף כדי שלוח הניהול יוכל להסביר סריקה ריקה */
export type RejectedCandidate = { url: string; reason: string };

/**
 * ניקוי קשיח: מועמד תקין רק אם יש לו URL אמיתי מדומיין מוכר וכותרת,
 * והוא עומד בכל קריטריוני הפרופיל (hardCriteriaViolation).
 * כשקיימות תוצאות חיפוש אמיתיות (grounded) — ה-URL חייב להיות מעוגן בהן,
 * כדי שלא יומצאו קישורים; בנוסף נפסלים עמודי תוצאות-חיפוש כלליים.
 *
 * `rejected` (אופציונלי) מקבל את הסיבות לפסילה — בלעדיו סריקה שחזרה ריקה
 * נראית בלוח הניהול כמו סריקה מוצלחת בלי מודעות.
 */
export function sanitizeCandidates(
  raw: unknown,
  profile: ScoutProfile,
  neighborhoods: string[],
  groundedUrls: Set<string> = new Set(),
  rejected: RejectedCandidate[] = [],
  limit = 12,
): ScoutCandidate[] {
  const list = Array.isArray((raw as { candidates?: unknown[] })?.candidates)
    ? ((raw as { candidates: unknown[] }).candidates as unknown[])
    : [];
  const out: ScoutCandidate[] = [];
  const seen = new Set<string>();
  // אכיפה קשיחה של האתרים שנבחרו בפרופיל: מודעה מאתר אחר נפסלת
  const allowedHosts = new Set(profileHosts(profile.sources));
  const drop = (url: string, reason: string) => {
    rejected.push({ url, reason });
  };

  // אינדקס לפי host+pathname — הלינק מהמודל לפעמים שונה רק בפרמטרים
  const groundedByPath = new Set<string>();
  for (const g of groundedUrls) {
    try {
      const gu = new URL(g);
      groundedByPath.add(gu.hostname.replace(/^(www\.|m\.)/, "") + gu.pathname);
    } catch {
      // מתעלמים מ-URL עיוור בתוצאות
    }
  }

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
    const host = bareHost(url.hostname);
    const site = ALLOWED_HOSTS[host];
    if (!site) {
      drop(url.href, `אתר לא מוכר (${url.hostname})`);
      continue;
    }
    if (allowedHosts.size > 0 && !allowedHosts.has(host)) {
      drop(url.href, `${site} — מחוץ לאתרים שנבחרו בפרופיל`);
      continue;
    }
    // רק עמודי מודעה בודדים — לא עמודי חיפוש/מפה
    if (!looksLikeAdPage(url)) {
      drop(url.href, "קישור לעמוד חיפוש ולא למודעה");
      continue;
    }
    // עיגון בתוצאות חיפוש אמיתיות — מוודא שהמודל לא המציא קישור
    if (groundedUrls.size > 0) {
      const key = host + url.pathname;
      if (!groundedUrls.has(url.href) && !groundedByPath.has(key)) {
        drop(url.href, "הקישור לא הופיע בתוצאות החיפוש");
        continue;
      }
    }
    if (seen.has(url.href)) continue;
    seen.add(url.href);

    const title = s(c["title"], 160);
    if (!title) {
      drop(url.href, "למודעה אין כותרת");
      continue;
    }

    const deal =
      c["deal_type"] === "מכירה" || c["deal_type"] === "השכרה" ? (c["deal_type"] as string) : null;
    const score = Math.max(0, Math.min(100, Math.round(Number(c["match_score"]) || 0)));

    const cand: ScoutCandidate = {
      source_site: site,
      source_url: url.href,
      title,
      deal_type: deal,
      price: n(c["price"]),
      rooms: n(c["rooms"]),
      size_sqm: n(c["size_sqm"]),
      // הטקסט הגולמי נשמר לתצוגת האדמין; הבדיקה מול השכונות הקנוניות
      // נעשית בסינון הקשיח למטה
      neighborhood: s(c["neighborhood"], 80),
      address: s(c["address"], 160),
      has_mamad: b(c["has_mamad"]),
      has_elevator: b(c["has_elevator"]),
      has_parking: b(c["has_parking"]),
      has_balcony: b(c["has_balcony"]),
      raw_summary: s(c["summary"], 600),
      match_score: score,
      match_reason: s(c["match_reason"], 240),
    };

    // מועמד שסותר את קריטריוני הפרופיל נפסל — ואינו נספר במכסה
    const violation = hardCriteriaViolation(cand, profile, neighborhoods);
    if (violation !== null) {
      drop(url.href, violation);
      continue;
    }

    out.push(cand);
    if (out.length >= limit) break;
  }
  return out;
}

function buildUserPrompt(p: ScoutProfile): string {
  const parts: string[] = [];
  parts.push(`סוג עסקה: ${p.deal_type}`);
  parts.push(`עיר: ${p.city}`);
  if (p.neighborhoods.length) {
    parts.push(`שכונות (קריטריון מחייב — רק מודעות בשכונות האלה): ${p.neighborhoods.join(", ")}`);
  }
  if (p.min_price) parts.push(`מחיר מינימלי: ${p.min_price} ש"ח`);
  if (p.max_price) parts.push(`מחיר מקסימלי: ${p.max_price} ש"ח`);
  if (p.min_rooms && p.max_rooms && p.min_rooms === p.max_rooms) {
    parts.push(`מספר חדרים: ${p.min_rooms} בדיוק`);
  } else {
    if (p.min_rooms) parts.push(`מינימום חדרים: ${p.min_rooms}`);
    if (p.max_rooms) parts.push(`מקסימום חדרים: ${p.max_rooms}`);
  }
  if (p.min_size) parts.push(`מינימום מ"ר: ${p.min_size}`);
  const needs = [
    p.needs_mamad ? 'ממ"ד' : null,
    p.needs_elevator ? "מעלית" : null,
    p.needs_parking ? "חניה" : null,
    p.needs_balcony ? "מרפסת" : null,
  ].filter(Boolean);
  if (needs.length) parts.push(`חובה: ${needs.join(", ")}`);
  if (p.notes) parts.push(`הערות: ${p.notes}`);

  const sites = p.sources
    .map((x) => SITE_QUERY[x])
    .filter(Boolean)
    .join(" OR ");
  // האתרים שנבחרו נאכפים גם ב-allowed_domains של כלי החיפוש; הניסוח כאן
  // תואם לכך, כדי שהמודל לא יבזבז חיפושים על אתרים שממילא ייחסמו
  const scope = sites
    ? `חפש אך ורק ב: ${sites} — מודעה מאתר אחר לא תתקבל`
    : 'חפש באתרי הנדל"ן המרכזיים בישראל';

  return `${scope}
מצא מודעות נדל"ן עדכניות שמתאימות לקריטריונים הבאים:
${parts.join("\n")}

כל הקריטריונים למעלה מחייבים: מודעה שסותרת אחד מהם — אל תכלול. כשהוגדר קריטריון מספרי (מחיר/חדרים/מ"ר) — כלול רק מודעות שהערך בהן ידוע ועומד בו.
בצע כמה חיפושים לפי הצורך, ואז החזר JSON רק עם מודעות שעומדות בכל הקריטריונים, כולל ה-URL המדויק של עמוד המודעה. אם אין כאלה — החזר {"candidates":[]}. מועמדים עם match_score נמוך מ-${MIN_MATCH_SCORE} מסוננים אוטומטית.`;
}

/** לוחות שיש להם מנוע סריקה ישיר — לא עוברים דרך חיפוש האינטרנט של Claude */
const DIRECT_SOURCES = new Set(["yad2", "komo"]);

/** מה קרה בסריקה של לוח אחד — כדי שלוח הניהול יראה כיסוי ולא רק תוצאה */
export type SiteRunReport = {
  site: string;
  /** כמה תוצאות הלוח מדווח שיש לשאילתה (המספר שהגולש רואה) */
  total: number;
  /** כמה מודעות הצלחנו לסרוק בפועל */
  fetched: number;
  /** כמה מהן עברו את הסינון הקשיח */
  matched: number;
  error: string | null;
};

export type WebPropertySearchResult = {
  candidates: ScoutCandidate[];
  searches: number;
  rejected: RejectedCandidate[];
  sites: SiteRunReport[];
};

/** תקציב עמודי פיד לסריקת יד2 של פרופיל אחד, מתחלק בין השכונות */
const YAD2_PAGE_BUDGET = 24;
/** מעל זה מוותרים על פילוח לשכונות וסורקים את כל העיר */
const MAX_HOOD_QUERIES = 4;

/**
 * מסנן מועמדים מסריקה ישירה: אותו סינון קשיח, בלי בדיקת עיגון או URL.
 *
 * הבדל אחד מהותי בשכונות: בסינון של מודל שפה שכונה היא טקסט חופשי, ולכן
 * שם שאינו מזוהה ברשימה הקנונית לא פוסל (יכול להיות וריאנט כתיב). כאן
 * השכונה מגיעה משדה מובנה של הלוח עצמו, ולכן שם שאינו תואם לפרופיל הוא
 * באמת שכונה אחרת — ומודעה כזו נפסלת גם אם השם אינו ברשימה שלנו.
 */
function acceptDirect(
  candidates: ScoutCandidate[],
  profile: ScoutProfile,
  neighborhoods: string[],
  rejected: RejectedCandidate[],
): ScoutCandidate[] {
  const out: ScoutCandidate[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.source_url)) continue;
    seen.add(c.source_url);

    if (profile.neighborhoods.length && c.neighborhood) {
      if (!hoodMatches(c.neighborhood, profile.neighborhoods)) {
        rejected.push({ url: c.source_url, reason: `שכונה ${c.neighborhood} מחוץ לפרופיל` });
        continue;
      }
    }

    const violation = hardCriteriaViolation(c, profile, neighborhoods);
    if (violation !== null) {
      rejected.push({ url: c.source_url, reason: violation });
      continue;
    }
    out.push(c);
  }
  return out;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** סורק את יד2 ישירות — שכונה-שכונה כשהוגדרו שכונות, אחרת כל העיר */
async function runYad2Source(
  profile: ScoutProfile,
  neighborhoods: string[],
  rejected: RejectedCandidate[],
): Promise<{ candidates: ScoutCandidate[]; report: SiteRunReport }> {
  const report: SiteRunReport = { site: "יד2", total: 0, fetched: 0, matched: 0, error: null };
  try {
    const { resolveYad2Location, fetchYad2Listings, yad2ItemToCandidate } =
      await import("@/lib/yad2.server");
    const dealType = profile.deal_type === "השכרה" ? "rent" : "forsale";
    // חיפוש פר-שכונה מדויק בהרבה מסינון בדיעבד: שאילתה עירונית מחזירה
    // אלפי מודעות, ותקציב העמודים היה נגמר הרבה לפני השכונה המבוקשת
    const hoods = profile.neighborhoods.slice(0, MAX_HOOD_QUERIES);
    if (profile.neighborhoods.length > MAX_HOOD_QUERIES) {
      report.error = `נסרקו ${MAX_HOOD_QUERIES} השכונות הראשונות מתוך ${profile.neighborhoods.length}`;
    }
    const targets: Array<string | null> = hoods.length ? hoods : [null];
    const maxPages = Math.max(3, Math.floor(YAD2_PAGE_BUDGET / targets.length));

    const raw: ScoutCandidate[] = [];
    for (const hood of targets) {
      const location = await resolveYad2Location(profile.city, hood);
      if (!location) {
        rejected.push({ url: "", reason: `יד2 לא מזהה את ${hood ?? profile.city}` });
        continue;
      }
      const found = await fetchYad2Listings(
        {
          dealType,
          location,
          minRooms: profile.min_rooms,
          maxRooms: profile.max_rooms,
          minPrice: profile.min_price,
          maxPrice: profile.max_price,
          needsMamad: profile.needs_mamad,
          needsElevator: profile.needs_elevator,
          needsParking: profile.needs_parking,
          needsBalcony: profile.needs_balcony,
        },
        { maxPages },
      );
      report.total += found.total;
      report.fetched += found.items.length;
      for (const item of found.items) raw.push(yad2ItemToCandidate(item, dealType));
    }

    const accepted = acceptDirect(raw, profile, neighborhoods, rejected);
    report.matched = accepted.length;
    return { candidates: accepted, report };
  } catch (err) {
    report.error = errorText(err);
    return { candidates: [], report };
  }
}

/**
 * סורק את קומו ישירות. קומו לא חושף מזהי שכונה, ולכן השאילתה עירונית
 * והסינון לשכונות נעשה אצלנו — הכמויות שם קטנות, אז זה מספיק.
 */
async function runKomoSource(
  profile: ScoutProfile,
  neighborhoods: string[],
  rejected: RejectedCandidate[],
): Promise<{ candidates: ScoutCandidate[]; report: SiteRunReport }> {
  const report: SiteRunReport = { site: "קומו", total: 0, fetched: 0, matched: 0, error: null };
  try {
    const { fetchKomoListings, komoCardToCandidate } = await import("@/lib/komo.server");
    const query = {
      dealType: (profile.deal_type === "השכרה" ? "rent" : "forsale") as "rent" | "forsale",
      city: profile.city,
      minRooms: profile.min_rooms,
      maxRooms: profile.max_rooms,
      minPrice: profile.min_price,
      maxPrice: profile.max_price,
      needsMamad: profile.needs_mamad,
      needsElevator: profile.needs_elevator,
      needsParking: profile.needs_parking,
      needsBalcony: profile.needs_balcony,
    };
    const found = await fetchKomoListings(query);
    report.total = found.total;
    report.fetched = found.cards.length;
    if (found.partial) report.error = "העימוד המלא בקומו דורש חשבון — נסרק מה שזמין לאורח";

    const accepted = acceptDirect(
      found.cards.map((card) => komoCardToCandidate(card, query)),
      profile,
      neighborhoods,
      rejected,
    );
    report.matched = accepted.length;
    return { candidates: accepted, report };
  } catch (err) {
    report.error = errorText(err);
    return { candidates: [], report };
  }
}

/**
 * ליבת סריקת האינטרנט — משותפת לסוכן הסריקה של האדמין ולחיפוש החכם
 * של הלקוחות. feature קובע איך האירוע נרשם ב-ai_usage_events.
 */
/**
 * חיפוש האינטרנט של Claude — המסלול היחיד שזמין ללוחות שחוסמים סריקה
 * אוטומטית. מוגבל במהותו: המודל מריץ מספר קטן של חיפושים ומחזיר רק מה
 * שמנוע החיפוש אינדקס, ולכן הוא לעולם לא יחזיר את כל תוצאות הלוח.
 */
async function runLlmSources(
  llmProfile: ScoutProfile,
  neighborhoods: string[],
  userId: string | null,
  feature: string,
  rejected: RejectedCandidate[],
  limit: number,
): Promise<{ candidates: ScoutCandidate[]; searches: number }> {
  const { AI_MODEL, logAiUsage } = await import("@/lib/ai-usage.server");
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    await logAiUsage({
      feature,
      model: AI_MODEL,
      status: "error",
      errorMessage: "missing ANTHROPIC_API_KEY",
      userId,
    });
    throw new Error("סוכן הסריקה אינו זמין כרגע (חסר מפתח API)");
  }

  /* אכיפת האתרים שנבחרו כבר בשלב החיפוש: "site:" בתוך הפרומפט הוא רמז
   * שהמודל חופשי להתעלם ממנו, ואילו allowed_domains מגביל את מנוע החיפוש
   * עצמו — כך "הומלס בלבד" באמת מחזיר מודעות מהומלס. */
  const allowedDomains = profileHosts(llmProfile.sources);
  const searchTool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 6,
  };
  if (allowedDomains.length) searchTool["allowed_domains"] = allowedDomains;

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
        tools: [searchTool],
        messages: [{ role: "user", content: buildUserPrompt(llmProfile) }],
      }),
    });
  } catch (err) {
    await logAiUsage({
      feature,
      model: AI_MODEL,
      status: "error",
      errorMessage: String(err),
      userId,
    });
    throw new Error("הסריקה נכשלה. נסו שוב בעוד רגע");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("scout failed", res.status, body);
    await logAiUsage({
      feature,
      model: AI_MODEL,
      status: "error",
      errorMessage: `HTTP ${res.status}`,
      userId,
    });
    if (res.status === 429) throw new Error("יותר מדי בקשות לסוכן. נסו שוב בעוד רגע");
    if (res.status === 401 || res.status === 403) throw new Error("סוכן הסריקה אינו זמין כרגע");
    throw new Error("הסריקה נכשלה. נסו שוב בעוד רגע");
  }

  type SearchResultBlock = { type?: string; url?: string };
  type ContentBlock = {
    type?: string;
    text?: string;
    content?: SearchResultBlock[] | { type?: string };
    citations?: Array<{ type?: string; url?: string }>;
  };
  const json = (await res.json()) as {
    content?: ContentBlock[];
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      server_tool_use?: { web_search_requests?: number };
    };
  };

  await logAiUsage({
    feature,
    model: AI_MODEL,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    status: "success",
    userId,
  });

  // איסוף ה-URLים האמיתיים מתוצאות החיפוש ומהציטוטים —
  // המקור האמין היחיד; קישור שהמודל "המציא" לא יופיע כאן וייפסל.
  const groundedUrls = new Set<string>();
  for (const block of json.content ?? []) {
    if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r?.type === "web_search_result" && typeof r.url === "string") groundedUrls.add(r.url);
      }
    }
    for (const cite of block?.citations ?? []) {
      if (typeof cite?.url === "string") groundedUrls.add(cite.url);
    }
  }

  const text = (json.content ?? [])
    .filter((c) => c?.type === "text" || typeof c?.text === "string")
    .map((c) => c?.text ?? "")
    .join("\n")
    .trim();

  // גדרות קוד (```json) נפוצות בתשובה שמלווה בטקסט — מסירים לפני הפענוח
  const fenced = text.replace(/```(?:json)?/gi, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced);
  } catch {
    // כישלון פענוח אינו "אפס תוצאות" — מדווחים אותו כדי שלא ייראה כסריקה תקינה
    rejected.push({ url: "", reason: "המודל לא החזיר JSON תקין" });
    parsed = {};
  }

  const candidates = sanitizeCandidates(
    parsed,
    llmProfile,
    neighborhoods,
    groundedUrls,
    rejected,
    limit,
  );

  // אימות עדין שהעמודים חיים: פוסל רק 404/410 (חסימת בוטים אינה פסילה)
  const verdicts = await Promise.all(candidates.map((c) => verifyCandidateUrl(c.source_url)));
  const live = candidates.filter((c, i) => {
    if (verdicts[i] === "gone") rejected.push({ url: c.source_url, reason: "המודעה כבר לא קיימת" });
    return verdicts[i] !== "gone";
  });

  return { candidates: live, searches: json.usage?.server_tool_use?.web_search_requests ?? 0 };
}

/**
 * ליבת סריקת האינטרנט — משותפת לסוכן הסריקה של האדמין ולחיפוש החכם
 * של הלקוחות. feature קובע איך האירוע נרשם ב-ai_usage_events.
 */
export async function runWebPropertySearch(
  profile: ScoutProfile,
  neighborhoods: string[],
  userId: string | null = null,
  feature = "admin_scout",
  opts: { limit?: number } = {},
): Promise<WebPropertySearchResult> {
  const limit = opts.limit ?? 300;
  const rejected: RejectedCandidate[] = [];
  const sites: SiteRunReport[] = [];
  const direct: ScoutCandidate[] = [];

  // מסלול 1 — לוחות שנסרקים ישירות. כל אחד רץ בנפרד כדי שכשל באחד
  // (חסימה, timeout) לא ימחק את התוצאות של השני.
  for (const source of profile.sources) {
    if (!DIRECT_SOURCES.has(source)) continue;
    const runner = source === "yad2" ? runYad2Source : runKomoSource;
    const result = await runner(profile, neighborhoods, rejected);
    direct.push(...result.candidates);
    sites.push(result.report);
  }
  direct.sort((a, b) => b.match_score - a.match_score);

  // מסלול 2 — רק האתרים שאי אפשר לסרוק ישירות מגיעים לחיפוש של Claude.
  // כשלא נשאר אף אתר כזה לא פונים ל-API בכלל (חוסך עלות וזמן).
  const llmSources = profile.sources.filter((s) => !DIRECT_SOURCES.has(s));
  if (!llmSources.length) {
    return { candidates: direct.slice(0, limit), searches: 0, rejected, sites };
  }

  let llm: { candidates: ScoutCandidate[]; searches: number } = { candidates: [], searches: 0 };
  try {
    llm = await runLlmSources(
      { ...profile, sources: llmSources },
      neighborhoods,
      userId,
      feature,
      rejected,
      Math.min(12, Math.max(0, limit - direct.length)),
    );
  } catch (err) {
    // כשל בחיפוש ה-AI (מפתח חסר, מכסה, שגיאת רשת) לא מוחק מאות מודעות
    // אמיתיות שכבר נסרקו ישירות מהלוחות — הוא מדווח לצד התוצאות.
    if (!sites.length) throw err;
    sites.push({
      site: "חיפוש AI",
      total: 0,
      fetched: 0,
      matched: 0,
      error: errorText(err),
    });
  }

  // המועמדים מהסריקה הישירה קודמים: הם מגיעים מהלוח עצמו ולא מהשערה של
  // מודל שפה. הדה-דופ שומר על הראשון שנראה עבור כל קישור.
  const merged: ScoutCandidate[] = [];
  const seenUrls = new Set<string>();
  for (const c of [...direct, ...llm.candidates]) {
    if (seenUrls.has(c.source_url)) continue;
    seenUrls.add(c.source_url);
    merged.push(c);
    if (merged.length >= limit) break;
  }

  return { candidates: merged, searches: llm.searches, rejected, sites };
}

/** מריץ סריקת אינטרנט עבור פרופיל של סוכן הסריקה (האדמין) */
export const scoutProfileCandidates = (
  profile: ScoutProfile,
  neighborhoods: string[],
  userId: string | null = null,
) => runWebPropertySearch(profile, neighborhoods, userId, "admin_scout");
