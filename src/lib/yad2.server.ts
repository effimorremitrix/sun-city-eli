/**
 * לקוח יד2 אמיתי — במקום לבקש ממודל שפה לחפש בגוגל, פונים ישירות לפיד
 * שהאתר של יד2 עצמו צורך, ומקבלים את אותה קבוצת מודעות שהגולש רואה.
 *
 * עמודי ה-HTML של יד2 חסומים ב-Radware, ולכן אין כאן גירוד עמודים ואין
 * העשרה מעמוד המודעה — כל המידע מגיע מהפיד. משום שהעמוד חסום, גם אין טעם
 * לאמת מודעה בבקשת HTTP (היא תמיד תחזור כחסומה); הטריות מובטחת מהפיד.
 */

import type { ScoutCandidate } from "@/lib/scout.server";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";

/**
 * סט הכותרות שמאפשר גישה ל-gw.yad2.co.il מהשרת. בלי origin/referer
 * ו-sec-fetch-site: same-site הבקשה מנותבת לאתגר ה-JS של Radware ומחזירה 302.
 */
const YAD2_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "accept-language": "he-IL,he;q=0.9",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  origin: "https://www.yad2.co.il",
  referer: "https://www.yad2.co.il/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

const GW = "https://gw.yad2.co.il";
const REQUEST_TIMEOUT_MS = 10_000;
/** השהיה בין עמודים — נימוס כלפי יד2 והתחמקות מהגבלת קצב */
const PAGE_DELAY_MS = 250;

/** כשל מזוהה של יד2 — מבדיל בין חסימה לבין "אין תוצאות" */
export class Yad2Error extends Error {
  readonly kind: "blocked" | "http" | "network";
  constructor(kind: "blocked" | "http" | "network", message: string) {
    super(message);
    this.name = "Yad2Error";
    this.kind = kind;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * נרמול טקסט עברי להשוואה: הסרת ניקוד/גרשיים/מקפים ואיחוד כתיב מלא וחסר
 * (יו"ד/וי"ו כפולה). באתר שלנו כתוב "קריית השרון" וביד2 "קרית השרון" —
 * בלי הנרמול הזה כל מודעה בשכונה הזו נפסלת. אותו כלל מיישר גם "חנייה"/"חניה".
 *
 * שימו לב: אסור להשתמש כאן ב-\b — בביטויים רגולריים של JS אותיות עבריות
 * אינן "תווי מילה", ולכן גבול מילה לעולם לא יתפוס מילה עברית.
 */
export function normalizeHebrew(value: string): string {
  return value
    .replace(/[֑-ׇ]/g, "")
    .replace(/["'`״׳]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/יי/g, "י")
    .replace(/וו/g, "ו")
    .replace(/\s+/g, " ")
    .trim();
}

type AutocompleteEntry = {
  fullTitleText?: string;
  cityId?: string;
  hoodId?: string;
  areaId?: string;
  regionId?: string;
};

type AutocompleteResponse = {
  hoods?: AutocompleteEntry[];
  cities?: AutocompleteEntry[];
  areas?: AutocompleteEntry[];
};

export type Yad2Location = {
  cityId: string;
  hoodId: string | null;
  areaId: string | null;
  /** חובה בפיד — בלעדיו יד2 מחזיר 400 "region is required" */
  regionId: string;
};

export type Yad2Item = {
  token?: string;
  price?: number;
  adType?: string;
  address?: {
    city?: { text?: string };
    area?: { text?: string };
    neighborhood?: { text?: string };
    street?: { text?: string };
    house?: { number?: number; floor?: number };
  };
  additionalDetails?: {
    property?: { text?: string };
    roomsCount?: number;
    squareMeter?: number;
  };
  metaData?: { coverImage?: string; images?: string[]; squareMeterBuild?: number };
  customer?: { agencyName?: string };
  tags?: Array<{ name?: string; id?: number }>;
};

type FeedResponse = {
  data?: Record<string, unknown> & {
    pagination?: { total?: number; totalPages?: number };
  };
};

/** בקשת GET ל-yad2 שמחזירה JSON, עם timeout וניסיון חוזר יחיד */
async function yad2Get<T>(url: string): Promise<T> {
  let lastError: Yad2Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await sleep(600);

    let res: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        res = await fetch(url, { headers: YAD2_HEADERS, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastError = new Yad2Error("network", `יד2 לא הגיב (${String(err)})`);
      continue;
    }

    const body = await res.text().catch(() => "");
    // עמוד HTML במקום JSON פירושו שהבקשה נותבה לאתגר הבוטים של Radware
    if (body.trimStart().startsWith("<")) {
      throw new Yad2Error("blocked", "יד2 חסם את הבקשה (הגנת בוטים)");
    }
    if (!res.ok) {
      // 429/5xx שווים ניסיון נוסף; 4xx אחר הוא באג בפרמטרים ולא ישתנה
      const error = new Yad2Error("http", `יד2 החזיר שגיאה ${res.status}`);
      if (res.status !== 429 && res.status < 500) throw error;
      lastError = error;
      continue;
    }

    try {
      return JSON.parse(body) as T;
    } catch {
      throw new Yad2Error("blocked", "יד2 החזיר תשובה שאינה JSON");
    }
  }

  throw lastError ?? new Yad2Error("network", "יד2 לא הגיב");
}

/**
 * מזהי המיקום של שכונות נתניה, כרשת ביטחון לכשל ב-autocomplete — נבנים
 * מרשימת השכונות המיושרת ליד2 (neighborhoods.ts). המפתחות מנורמלים
 * ("קריית" → "קרית"), כי כך ההשוואה נעשית ב-resolveYad2Location.
 * שכונה בלי מזהה מאומת עדיין תיפתר דרך ה-autocomplete.
 */
const NETANYA_FALLBACK: Record<string, Yad2Location> = Object.fromEntries([
  ["", { cityId: "7400", hoodId: null, areaId: "17", regionId: "1" }],
  ...NEIGHBORHOODS.filter((n) => n.yad2HoodId != null).map((n) => [
    normalizeHebrew(n.he),
    { cityId: "7400", hoodId: n.yad2HoodId, areaId: "17", regionId: "1" },
  ]),
]);

/** מטמון לכל חיי התהליך — מזהי מיקום ביד2 אינם משתנים */
const locationCache = new Map<string, Yad2Location | null>();

function entryToLocation(entry: AutocompleteEntry): Yad2Location | null {
  if (!entry.cityId || !entry.regionId) return null;
  return {
    cityId: entry.cityId,
    hoodId: entry.hoodId ?? null,
    areaId: entry.areaId ?? null,
    regionId: entry.regionId,
  };
}

/**
 * מתרגם עיר (ושכונה אופציונלית) בעברית למזהי החיפוש של יד2.
 * מחזיר null כשלא נמצאה התאמה — הקורא יחליט אם לוותר על השכונה.
 */
export async function resolveYad2Location(
  city: string,
  neighborhood?: string | null,
): Promise<Yad2Location | null> {
  const cityKey = normalizeHebrew(city);
  const hoodKey = neighborhood ? normalizeHebrew(neighborhood) : "";
  const cacheKey = `${cityKey}|${hoodKey}`;
  const cached = locationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let resolved: Yad2Location | null = null;
  try {
    // שולחים את הצורה המנורמלת: יד2 מכיר "קרית השרון" ולא "קריית השרון"
    const query = hoodKey ? `${hoodKey} ${cityKey}` : cityKey;
    const res = await yad2Get<AutocompleteResponse>(
      `${GW}/address-autocomplete/realestate/v2?text=${encodeURIComponent(query)}`,
    );

    if (hoodKey) {
      // "קרית השרון, נתניה" — מתאימים גם את השכונה וגם את העיר, כדי לא
      // לתפוס שכונה בעלת שם דומה בעיר אחרת
      const hood = (res.hoods ?? []).find((h) => {
        const title = normalizeHebrew(h.fullTitleText ?? "");
        return title.startsWith(hoodKey) && title.includes(cityKey);
      });
      if (hood) resolved = entryToLocation(hood);
    }

    if (!resolved) {
      const cityEntry = (res.cities ?? []).find(
        (c) => normalizeHebrew(c.fullTitleText ?? "") === cityKey,
      );
      if (cityEntry) resolved = entryToLocation(cityEntry);
      // שכונה שלא זוהתה: מחפשים בכל העיר במקום להיכשל
      if (resolved && hoodKey) resolved = { ...resolved, hoodId: null };
    }
  } catch {
    resolved = null;
  }

  if (!resolved && cityKey === "נתניה") {
    resolved = NETANYA_FALLBACK[hoodKey] ?? NETANYA_FALLBACK[""] ?? null;
  }

  locationCache.set(cacheKey, resolved);
  return resolved;
}

export type Yad2Query = {
  dealType: "forsale" | "rent";
  location: Yad2Location;
  minRooms?: number | null;
  maxRooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  needsMamad?: boolean;
  needsElevator?: boolean;
  needsParking?: boolean;
  needsBalcony?: boolean;
};

export type Yad2FetchResult = {
  items: Yad2Item[];
  /** כמה מודעות יד2 מדווח שיש לשאילתה — המספר שהגולש רואה באתר */
  total: number;
  pagesFetched: number;
  /** נעצרנו בתקרת העמודים לפני שסיימנו את כל התוצאות */
  truncated: boolean;
};

function buildFeedUrl(query: Yad2Query, page: number): string {
  const p = new URLSearchParams();
  p.set("region", query.location.regionId);
  if (query.location.areaId) p.set("area", query.location.areaId);
  p.set("city", query.location.cityId);
  if (query.location.hoodId) p.set("neighborhood", query.location.hoodId);
  if (query.minRooms) p.set("minRooms", String(query.minRooms));
  if (query.maxRooms) p.set("maxRooms", String(query.maxRooms));
  if (query.minPrice) p.set("minPrice", String(Math.round(query.minPrice)));
  if (query.maxPrice) p.set("maxPrice", String(Math.round(query.maxPrice)));
  // הסינון בצד יד2 חוסך עמודים; הסינון הקשיח שלנו רץ עליו שוב בכל מקרה
  if (query.needsMamad) p.set("shelter", "1");
  if (query.needsElevator) p.set("elevator", "1");
  if (query.needsParking) p.set("parking", "1");
  if (query.needsBalcony) p.set("balcony", "1");
  p.set("page", String(page));
  return `${GW}/realestate-feed/${query.dealType}/feed?${p.toString()}`;
}

/**
 * שולף פריטים מכל דליי הפיד של עמוד אחד. יד2 מפצל את התוצאות לדליים
 * (private/agency/platinum/trio/…), והדליים המקודמים חוזרים בכל עמוד —
 * לכן הדה-דופ לפי token נעשה על פני כל העמודים יחד.
 */
function collectPageItems(data: FeedResponse["data"]): Yad2Item[] {
  const out: Yad2Item[] = [];
  for (const [key, value] of Object.entries(data ?? {})) {
    if (key === "pagination" || !Array.isArray(value)) continue;
    for (const item of value as Yad2Item[]) {
      // כרטיסי פרסום מגיעים באותם דליים בלי token/כתובת — הם אינם מודעות
      if (item?.token && item.address && item.additionalDetails?.roomsCount) out.push(item);
    }
  }
  return out;
}

/** שולף את כל המודעות של השאילתה, עמוד אחרי עמוד, עד תקרת בטיחות */
export async function fetchYad2Listings(
  query: Yad2Query,
  opts: { maxPages?: number; maxItems?: number } = {},
): Promise<Yad2FetchResult> {
  const maxPages = opts.maxPages ?? 12;
  const maxItems = opts.maxItems ?? 400;
  const byToken = new Map<string, Yad2Item>();
  let total = 0;
  let totalPages = 1;
  let page = 1;

  for (; page <= Math.min(maxPages, totalPages); page += 1) {
    if (page > 1) await sleep(PAGE_DELAY_MS);
    const res = await yad2Get<FeedResponse>(buildFeedUrl(query, page));
    const pagination = res.data?.pagination;
    if (page === 1) {
      total = pagination?.total ?? 0;
      totalPages = Math.max(1, pagination?.totalPages ?? 1);
    }

    const before = byToken.size;
    for (const item of collectPageItems(res.data)) {
      if (!byToken.has(item.token as string)) byToken.set(item.token as string, item);
    }
    // עמוד שלא הוסיף אף מודעה חדשה = הגענו לסוף בפועל (או שכולו מקודם)
    if (byToken.size === before) break;
    if (byToken.size >= maxItems) break;
  }

  const items = [...byToken.values()].slice(0, maxItems);
  return {
    items,
    total: total || items.length,
    pagesFetched: page - 1,
    truncated: totalPages > maxPages || items.length < byToken.size,
  };
}

/** תג מתקן במודעה → true. היעדר תג אינו הוכחה להיעדר המתקן, ולכן null */
function tagFlag(item: Yad2Item, needles: string[]): boolean | null {
  const names = (item.tags ?? []).map((t) => normalizeHebrew(t?.name ?? ""));
  return names.some((n) => needles.some((needle) => n.includes(needle))) ? true : null;
}

function buildTitle(item: Yad2Item): string {
  const property = item.additionalDetails?.property?.text ?? "נכס";
  const rooms = item.additionalDetails?.roomsCount;
  const street = item.address?.street?.text;
  const house = item.address?.house?.number;
  const hood = item.address?.neighborhood?.text;
  const where = [street && house ? `${street} ${house}` : street, hood].filter(Boolean).join(", ");
  const head = rooms ? `${property} ${rooms} חדרים` : property;
  return where ? `${head}, ${where}` : head;
}

function buildSummary(item: Yad2Item): string | null {
  const parts: string[] = [];
  const floor = item.address?.house?.floor;
  if (typeof floor === "number") parts.push(`קומה ${floor}`);
  const built = item.metaData?.squareMeterBuild;
  if (typeof built === "number" && built > 0) parts.push(`${built} מ"ר בנוי`);
  const agency = item.customer?.agencyName;
  parts.push(agency ? `מתיווך ${agency}` : "מודעה פרטית");
  const images = item.metaData?.images?.length ?? 0;
  if (images > 0) parts.push(`${images} תמונות`);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * ציון התאמה דטרמיניסטי. המודעות האלה הגיעו מהפיד של יד2 עצמו ועברו את
 * הסינון הקשיח, ולכן הן מתחילות מ-100 ויורדות רק על מידע חסר — בניגוד
 * לציון שמודל שפה ממציא. לעולם לא יורד מתחת ל-60 (רף הפסילה).
 */
function scoreItem(item: Yad2Item): number {
  let score = 100;
  if (size(item.additionalDetails?.squareMeter) === null) score -= 10;
  if (!item.metaData?.images?.length) score -= 5;
  if (!item.address?.street?.text) score -= 5;
  return Math.max(60, score);
}

const n = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/**
 * שטח שהמפרסם הקליד בטעות (ראינו "18686 מ"ר" לדירת 4 חדרים) גרוע מערך חסר:
 * הוא גם מוצג לסוכן וגם עובר סינון מ"ר מינימלי. מעל הסף מחזירים null.
 */
const size = (v: unknown): number | null => {
  const value = n(v);
  return value !== null && value <= 3000 ? value : null;
};

const s = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** ממיר מודעה מהפיד של יד2 למועמד בפורמט של סוכן הסריקה */
export function yad2ItemToCandidate(item: Yad2Item, dealType: "forsale" | "rent"): ScoutCandidate {
  const street = item.address?.street?.text;
  const house = item.address?.house?.number;
  const address = [street, house].filter(Boolean).join(" ") || null;

  return {
    source_site: "יד2",
    source_url: `https://www.yad2.co.il/realestate/item/${item.token}`,
    title: buildTitle(item).slice(0, 160),
    deal_type: dealType === "forsale" ? "מכירה" : "השכרה",
    price: n(item.price),
    rooms: n(item.additionalDetails?.roomsCount),
    size_sqm: size(item.additionalDetails?.squareMeter),
    neighborhood: s(item.address?.neighborhood?.text, 80),
    address: s(address, 160),
    has_mamad: tagFlag(item, ["ממד", "מרחב מוגן"]),
    has_elevator: tagFlag(item, ["מעלית"]),
    has_parking: tagFlag(item, ["חניה", "חנייה"]),
    has_balcony: tagFlag(item, ["מרפסת"]),
    raw_summary: s(buildSummary(item), 600),
    match_score: scoreItem(item),
    match_reason: "מודעה פעילה ביד2 שעונה על כל קריטריוני החיפוש",
  };
}
