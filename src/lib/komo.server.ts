/**
 * לקוח קומו (komo.co.il) — עמודי החיפוש של קומו נגישים מהשרת בלי הגנת בוטים,
 * ולכן אפשר לקרוא מהם מודעות אמיתיות במקום להישען על חיפוש של מודל שפה.
 *
 * המגבלה: קומו מגיש רק את העמוד הראשון (26 מודעות) לאורח — כל currPage>1
 * מנותב לעמוד ההתחברות. כדי לכסות שאילתה גדולה יותר אנחנו חותכים אותה
 * לטווחי מחיר צרים, שכל אחד מהם נכנס בעמוד ראשון אחד, ומאחדים.
 */

import type { ScoutCandidate } from "@/lib/scout.server";

const KOMO_HEADERS: Record<string, string> = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "he-IL,he;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

const BASE = "https://www.komo.co.il/code/nadlan";
const REQUEST_TIMEOUT_MS = 12_000;
const REQUEST_DELAY_MS = 300;
/** תקציב בקשות לשאילתה אחת — שומר על מסגרת ה-subrequests של Cloudflare */
const MAX_REQUESTS = 12;

/**
 * מחיר מתחת לזה במודעת מכירה (ומעל זה במודעת השכרה) הוא מודעה מהקטגוריה
 * השנייה שדלפה לעמוד — קומו משבץ מודעות ממומנות שלא תמיד תואמות לשאילתה.
 */
const SALE_RENT_BOUNDARY = 150_000;

export class KomoError extends Error {
  readonly kind: "blocked" | "http" | "network";
  constructor(kind: "blocked" | "http" | "network", message: string) {
    super(message);
    this.name = "KomoError";
    this.kind = kind;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type KomoQuery = {
  dealType: "forsale" | "rent";
  city: string;
  neighborhoods?: string[];
  minRooms?: number | null;
  maxRooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  needsMamad?: boolean;
  needsElevator?: boolean;
  needsParking?: boolean;
  needsBalcony?: boolean;
};

export type KomoCard = {
  id: string;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  propertyType: string | null;
  price: number | null;
  rooms: number | null;
  sizeSqm: number | null;
  floor: number | null;
  totalFloors: number | null;
};

export type KomoFetchResult = {
  cards: KomoCard[];
  /** כמה מודעות קומו מדווח שיש לשאילתה */
  total: number;
  requests: number;
  /** נסרקו פחות מודעות ממה שקומו מדווח (העימוד המלא דורש חשבון) */
  partial: boolean;
};

/** גבול עליון לחיתוך טווחי המחיר כשהפרופיל לא הגדיר מחיר מקסימלי */
const priceCeiling = (dealType: KomoQuery["dealType"]) =>
  dealType === "forsale" ? 20_000_000 : 60_000;

function buildUrl(query: KomoQuery, minPrice: number | null, maxPrice: number | null): string {
  const page = query.dealType === "forsale" ? "apartments-for-sale.asp" : "apartments-for-rent.asp";
  const p = new URLSearchParams();
  p.set("nehes", "1");
  p.set("cityName", query.city);
  if (query.minRooms) p.set("fromRooms", String(query.minRooms));
  if (query.maxRooms) p.set("toRooms", String(query.maxRooms));
  if (minPrice) p.set("fromPrice", String(Math.round(minPrice)));
  if (maxPrice) p.set("toPrice", String(Math.round(maxPrice)));
  if (query.needsMamad) p.set("yesMamad", "1");
  if (query.needsElevator) p.set("yesElevator", "1");
  if (query.needsParking) p.set("yesParking", "1");
  if (query.needsBalcony) p.set("yesBalcony", "1");
  return `${BASE}/${page}?${p.toString()}`;
}

async function komoGet(url: string): Promise<string> {
  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      res = await fetch(url, { headers: KOMO_HEADERS, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    throw new KomoError("network", `קומו לא הגיב (${String(err)})`);
  }

  if (!res.ok) throw new KomoError("http", `קומו החזיר שגיאה ${res.status}`);
  const body = await res.text();
  // כל עמוד מעבר לראשון מנותב לעמוד ההתחברות — לא שגיאה, פשוט אין מה לקרוא
  if (body.includes("כניסת משתמש")) {
    throw new KomoError("blocked", "קומו דורש התחברות לעמוד הזה");
  }
  return body;
}

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#8362;/g, "₪")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const digits = (value: string): number | null => {
  const num = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
};

/** חילוץ מונה התוצאות שקומו מציג ("228 מודעות") */
export function parseKomoTotal(html: string): number {
  const match = html.match(/([\d,]{1,9})\s*מודעות/);
  return match ? (digits(match[1] ?? "") ?? 0) : 0;
}

/**
 * חילוץ הכרטיסים מעמוד תוצאות. קומו מגיש שני מבני עטיפה שונים לאותו כרטיס
 * (מודעה ממומנת ומודעה רגילה), ולכן העוגן הוא הקישור למודעה ולא ה-div העוטף:
 *
 *   <a href="/code/nadlan/details/?modaaNum=4889445" …>
 *     <h2 class="title">נתניה, קריית צאנז, הרצוג 1</h2></a>
 *   <div class="price">2,700,000 ₪</div>
 *   <div class="description">דירה 4.0 חדרים (107 מ"ר) <br> קומה:1 מתוך 6 …
 */
const CARD_RE =
  /<a href="\/code\/nadlan\/details\/\?modaaNum=(\d+)"[\s\S]{0,400}?<h2 class="title">([\s\S]*?)<\/h2>[\s\S]{0,400}?<div class="price">([\s\S]*?)<\/div>[\s\S]{0,400}?<div class="description">([\s\S]*?)(?:<div|<span|<\/div>)/g;

export function parseKomoCards(html: string): KomoCard[] {
  const cards: KomoCard[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(CARD_RE)) {
    const id = match[1] ?? "";
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const title = decodeEntities(match[2] ?? "");
    const price = decodeEntities(match[3] ?? "");
    const description = decodeEntities(match[4] ?? "");

    // "נתניה, מרכז העיר, שמואל הנציב" → עיר, שכונה, רחוב. יש מודעות בלי
    // שכונה ("נתניה, קרל פופר 11"); שם המקטע השני הוא רחוב, לא שכונה.
    const parts = title
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const missing = (value: string | undefined) => !value || value.includes("לא צוין");
    const hasHood = parts.length >= 3 || (parts.length === 2 && !/\d/.test(parts[1] ?? ""));
    const neighborhood = hasHood && !missing(parts[1]) ? (parts[1] as string) : null;
    const streetPart = parts.length >= 3 ? parts[2] : hasHood ? undefined : parts[1];
    const street = missing(streetPart) ? null : (streetPart as string);
    // הקומה מופיעה גם כ"קומה: 3 מתוך 4" וגם כ"קומה:1 מתוך 6", ולעיתים "קרקע"
    const floors = description.match(/קומה:?\s*(\d+|קרקע)\s*מתוך\s*(\d+)/);
    const floorText = floors?.[1];

    cards.push({
      id,
      city: parts[0] ?? null,
      neighborhood,
      street,
      propertyType: description.match(/^([^\d]+?)\s*[\d.]/)?.[1]?.trim() || null,
      price: digits(price),
      rooms: digits(description.match(/([\d.]+)\s*חדרים/)?.[1] ?? ""),
      sizeSqm: digits(description.match(/\(([\d,.]+)\s*מ"ר\)/)?.[1] ?? ""),
      floor: floorText === "קרקע" ? 0 : floorText ? digits(floorText) : null,
      totalFloors: floors ? digits(floors[2] ?? "") : null,
    });
  }

  return cards;
}

/** מודעה שאינה מתאימה לסוג העסקה של העמוד (מודעה ממומנת שדלפה לתוכו) */
function matchesDealType(card: KomoCard, dealType: KomoQuery["dealType"]): boolean {
  if (card.price == null) return true;
  return dealType === "forsale"
    ? card.price >= SALE_RENT_BOUNDARY
    : card.price < SALE_RENT_BOUNDARY;
}

/**
 * סורק את השאילתה בקומו. כשהתוצאות לא נכנסות בעמוד אחד, חוצים את טווח
 * המחיר לשניים ושואלים כל חצי בנפרד — כך מגיעים לכיסוי גבוה בהרבה מ-26
 * מודעות בלי לעקוף שום מנגנון הרשאות של קומו.
 */
export async function fetchKomoListings(query: KomoQuery): Promise<KomoFetchResult> {
  const byId = new Map<string, KomoCard>();
  const pending: Array<[number, number]> = [
    [query.minPrice ?? 0, query.maxPrice ?? priceCeiling(query.dealType)],
  ];
  let requests = 0;
  let total = 0;

  while (pending.length && requests < MAX_REQUESTS) {
    const [min, max] = pending.shift() as [number, number];
    if (requests > 0) await sleep(REQUEST_DELAY_MS);
    requests += 1;

    // הבקשה הראשונה נשלחת עם טווח המחיר של הפרופיל כפי שהוא, כדי שהמונה
    // שקומו מחזיר יהיה המונה של השאילתה המלאה ולא של פלח ממנה
    const isFirst = requests === 1;
    const html = await komoGet(
      buildUrl(
        query,
        isFirst ? (query.minPrice ?? null) : min,
        isFirst ? (query.maxPrice ?? null) : max,
      ),
    );
    const reported = parseKomoTotal(html);
    if (isFirst) total = reported;

    const cards = parseKomoCards(html).filter((c) => matchesDealType(c, query.dealType));
    for (const card of cards) if (!byId.has(card.id)) byId.set(card.id, card);

    // פלח שקומו מדווח עליו יותר תוצאות ממה שהגיש — עדיין מסתיר מודעות
    // (לאורח הוא מגיש עד עמוד אחד, ולעיתים אפילו פחות ממנו). מפצלים אותו
    // בחציון המחירים שנצפו ולא באמצע הטווח: מחירי נדל"ן מרוכזים בקצה
    // התחתון, וחצייה אריתמטית הייתה משאירה פלח אחד עמוס לנצח.
    if (reported > cards.length) {
      const prices = cards
        .map((c) => c.price)
        .filter((p): p is number => p != null)
        .sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      if (median != null && median > min && median < max) {
        pending.push([min, median], [median + 1, max]);
      }
    }
  }

  return {
    cards: [...byId.values()],
    total: total || byId.size,
    requests,
    partial: total > byId.size,
  };
}

/** ציון התאמה דטרמיניסטי — ראו ההסבר המקביל ב-yad2.server.ts */
function scoreCard(card: KomoCard): number {
  let score = 100;
  if (card.sizeSqm == null) score -= 10;
  if (card.street == null) score -= 5;
  if (card.price == null) score -= 20;
  return Math.max(60, score);
}

const s = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** ממיר כרטיס מקומו למועמד בפורמט של סוכן הסריקה */
export function komoCardToCandidate(card: KomoCard, query: KomoQuery): ScoutCandidate {
  const rooms = card.rooms;
  const head = `${card.propertyType ?? "נכס"}${rooms ? ` ${rooms} חדרים` : ""}`;
  const where = [card.street, card.neighborhood].filter(Boolean).join(", ");
  const summary = [
    card.floor != null && card.totalFloors != null
      ? `קומה ${card.floor} מתוך ${card.totalFloors}`
      : null,
    card.sizeSqm != null ? `${card.sizeSqm} מ"ר` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    source_site: "קומו",
    source_url: `https://www.komo.co.il/code/nadlan/details/?modaaNum=${card.id}`,
    title: (where ? `${head}, ${where}` : head).slice(0, 160),
    deal_type: query.dealType === "forsale" ? "מכירה" : "השכרה",
    price: card.price,
    rooms,
    size_sqm: card.sizeSqm,
    neighborhood: s(card.neighborhood, 80),
    address: s(card.street, 160),
    // קומו מסנן מתקנים בצד השרת אבל לא מציג אותם בכרטיס: כשהסינון הופעל
    // כל התוצאות עומדות בו, ואחרת אין מידע — ולעולם לא "אין" (false)
    has_mamad: query.needsMamad ? true : null,
    has_elevator: query.needsElevator ? true : null,
    has_parking: query.needsParking ? true : null,
    has_balcony: query.needsBalcony ? true : null,
    raw_summary: s(summary, 600),
    match_score: scoreCard(card),
    match_reason: "מודעה פעילה בקומו שעונה על קריטריוני החיפוש",
  };
}
