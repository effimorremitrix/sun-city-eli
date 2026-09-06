/**
 * סוג עסקה — שני מרחבי ערכים שונים שחיו עד כאן בערבוביה:
 *
 * צד המודעה (listings / market_listings):   'מכירה' | 'השכרה'
 * כוונת הלקוח (search_profiles / leads):     'קנייה' | 'השכרה' | 'מכירה'
 *   כאשר 'מכירה' על ליד = הלקוח *מוכר* נכס, ולכן אינו מקבל התאמות לנכסים.
 *
 * הקובץ איזומורפי (רץ בדפדפן ובשרת) — כל התאמה/סינון עוברים דרכו כדי
 * ש"קנייה" בפרופיל תמיד תפגוש נכסי "מכירה" ולעולם לא תיפול בהשוואת מחרוזות.
 */

export const LISTING_DEAL_TYPES = ["מכירה", "השכרה"] as const;
export type ListingDealType = (typeof LISTING_DEAL_TYPES)[number];

/** כוונות לקוח: קונה / שוכר / מוכר */
export const INTENT_TYPES = ["קנייה", "השכרה", "מכירה"] as const;
export type IntentType = (typeof INTENT_TYPES)[number];

/** כוונות שמקבלות התאמות לנכסים (מוכר אינו ביניהן) */
export const BUYER_INTENTS: readonly IntentType[] = ["קנייה", "השכרה"];

export const isListingDealType = (v: unknown): v is ListingDealType =>
  typeof v === "string" && (LISTING_DEAL_TYPES as readonly string[]).includes(v);

export const isIntentType = (v: unknown): v is IntentType =>
  typeof v === "string" && (INTENT_TYPES as readonly string[]).includes(v);

/**
 * כוונת לקוח → סוג המודעה שתואם לה. 'מכירה' (מוכר) אינה כוונת חיפוש ולכן
 * מחזירה null; ערך לא מוכר/ריק מחזיר null (= בלי סינון).
 */
export function intentToListingDeal(intent: string | null | undefined): ListingDealType | null {
  if (intent === "קנייה") return "מכירה";
  if (intent === "השכרה") return "השכרה";
  return null;
}

/**
 * נרמול ערך "סוג עסקה" מכל מקור לסוג מודעה — לסינון נכסים. מקבל גם ערכי
 * צד-מודעה כפי שהם ('מכירה' מסינון ידני = נכסים למכירה) וגם כוונות ('קנייה').
 */
export function toListingDeal(value: string | null | undefined): ListingDealType | null {
  if (value === "קנייה" || value === "מכירה") return "מכירה";
  if (value === "השכרה") return "השכרה";
  return null;
}

/** סוג מודעה → כוונת הלקוח המקבילה (לטפסים שמציגים "קנייה / שכירות") */
export function listingDealToIntent(deal: string | null | undefined): IntentType {
  return deal === "השכרה" ? "השכרה" : "קנייה";
}
