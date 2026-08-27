import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";
import prop7 from "@/assets/prop-7.jpg";
import prop8 from "@/assets/prop-8.jpg";
import { DICTS, formatPrice, type Locale } from "@/lib/i18n";

/** פריט מדיה בגלריית הנכס — תמונה או סרטון */
export type ListingImage = {
  id: string;
  url: string;
  storage_path: string | null;
  external_url: string | null;
  sort_order: number;
  kind: "image" | "video";
};

/** תרגום פר-שפה של שדות הטקסט של נכס (עמודת translations) */
export type ListingTranslation = {
  title?: string;
  description?: string;
};

/** נכס כפי שהוא נשמר במסד הנתונים ומוצג באתר */
/** הסוכן שאליו משויך הנכס — פניות על הנכס מנותבות אליו */
export type ListingAgent = {
  slug: string;
  name: string;
  phone: string | null;
  phoneTel: string | null;
  photoUrl: string | null;
};

export type Listing = {
  id: string;
  site_id: string | null;
  deal_type: string;
  title: string;
  description: string | null;
  translations?: Partial<Record<string, ListingTranslation>> | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  /** קואורדינטות לתצוגת המפה — null כשאין מיקום מדויק */
  lat: number | null;
  lng: number | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  floor: string | null;
  has_mamad: boolean;
  has_elevator: boolean;
  has_parking: boolean;
  has_balcony: boolean;
  has_storage: boolean;
  storage_count: number | null;
  parking_count: number | null;
  tag: string | null;
  image_url: string | null;
  image_key: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  images?: ListingImage[];
  agent?: ListingAgent | null;
  /**
   * בלוח הניהול בלבד: האם המשתמש הנוכחי רשאי לערוך את הנכס. המלאי המשותף
   * מוצג לכל הסוכנים, אבל נכס של site אחר הוא לקריאה בלבד.
   */
  editable?: boolean;
};

/** פילטרים מובנים — משמשים גם את החיפוש הידני וגם את חיפוש ה‑AI */
export type ListingFilters = {
  deal_type?: string | null;
  neighborhoods?: string[];
  /** רחוב / כתובת חופשית — חיפוש חלקי בשדה הכתובת */
  street?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  min_rooms?: number | null;
  /** מספר חדרים מדויק (±0.5) — "3 חדרים" איננו "3 ומעלה" */
  rooms?: number | null;
  max_rooms?: number | null;
  min_size?: number | null;
  needs_mamad?: boolean;
  needs_elevator?: boolean;
  needs_parking?: boolean;
  needs_balcony?: boolean;
};

/** נרמול טקסט להשוואת רחוב/כתובת: הסרת גרשיים ורווחים כפולים */
export const normalizeText = (s: string) =>
  s
    .replace(/["'׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const LOCAL_IMAGES: Record<string, string> = {
  "prop-1": prop1,
  "prop-2": prop2,
  "prop-3": prop3,
  "prop-4": prop4,
  "prop-5": prop5,
  "prop-6": prop6,
  "prop-7": prop7,
  "prop-8": prop8,
};

/** כל תמונות הנכס (ללא סרטונים): קודם הגלריה שהועלתה בניהול, אחרת כתובת/תמונה מקומית */
export function listingImages(l: Pick<Listing, "image_url" | "image_key" | "images">): string[] {
  const gallery = (l.images ?? [])
    .filter((i) => i.kind !== "video")
    .map((i) => i.url)
    .filter(Boolean);
  if (gallery.length) return gallery;
  if (l.image_url && l.image_url.trim()) return [l.image_url];
  if (l.image_key && LOCAL_IMAGES[l.image_key]) return [LOCAL_IMAGES[l.image_key]!];
  return [];
}

/** תמונת הנכס הראשית */
export function listingImage(
  l: Pick<Listing, "image_url" | "image_key" | "images">,
): string | null {
  return listingImages(l)[0] ?? null;
}

export const LISTING_FEATURES = [
  { key: "has_mamad", need: "needs_mamad", label: "ממ״ד" },
  { key: "has_elevator", need: "needs_elevator", label: "מעלית" },
  { key: "has_parking", need: "needs_parking", label: "חניה" },
  { key: "has_balcony", need: "needs_balcony", label: "מרפסת" },
] as const;

/** סינון בצד הלקוח — אותם כללים בדיוק כמו בהתאמת ההתראות */
export function matchesFilters(l: Listing, f: ListingFilters): boolean {
  if (f.deal_type && l.deal_type !== f.deal_type) return false;
  if (f.neighborhoods?.length && !(l.neighborhood && f.neighborhoods.includes(l.neighborhood)))
    return false;
  if (f.street && f.street.trim()) {
    const street = normalizeText(f.street);
    const haystack = normalizeText(`${l.address ?? ""} ${l.title ?? ""}`);
    if (!haystack.includes(street)) return false;
  }
  if (f.min_price != null && l.price != null && l.price < f.min_price) return false;
  if (f.max_price != null && l.price != null && l.price > f.max_price) return false;
  if (f.min_rooms != null && l.rooms != null && l.rooms < f.min_rooms) return false;
  if (f.rooms != null && l.rooms != null && Math.abs(l.rooms - f.rooms) > 0.5) return false;
  if (f.max_rooms != null && l.rooms != null && l.rooms > f.max_rooms) return false;
  if (f.min_size != null && l.size_sqm != null && l.size_sqm < f.min_size) return false;
  if (f.needs_mamad && !l.has_mamad) return false;
  if (f.needs_elevator && !l.has_elevator) return false;
  if (f.needs_parking && !l.has_parking) return false;
  if (f.needs_balcony && !l.has_balcony) return false;
  return true;
}

/** גזירת רשימת רחובות ייחודיים מכתובות הנכסים — ללא מספרי בית, עיר ושכונה */
export function streetVocabulary(
  rows: Array<Pick<Listing, "address" | "title">>,
  neighborhoods: string[] = [],
): string[] {
  const seen = new Set<string>();
  const streets: string[] = [];
  for (const row of rows) {
    const address = (row.address ?? "").trim();
    if (!address) continue;
    let street = address.split(",")[0]!.replace(/\d+/g, "");
    street = street.replace(/נתניה/g, "");
    for (const hood of neighborhoods) street = street.split(hood).join("");
    street = street.replace(/\s+/g, " ").trim();
    if (street.length < 2) continue;
    const key = normalizeText(street);
    if (seen.has(key)) continue;
    seen.add(key);
    streets.push(street);
    if (streets.length >= 80) break;
  }
  return streets;
}

/** התאמה דטרמיניסטית: האם הבקשה (או מילה ממנה, גם עם תחילית ב/ל) היא רחוב מוכר */
export function matchQueryStreet(query: string, streets: string[]): string | null {
  const q = normalizeText(query);
  if (q.length < 2) return null;
  for (const street of streets) {
    const s = normalizeText(street);
    if (q.includes(s) || s.includes(q)) return street;
  }
  const tokens = q.split(" ").filter((t) => t.length >= 3);
  for (const token of tokens) {
    const variants = /^[בל]/.test(token) ? [token, token.slice(1)] : [token];
    for (const street of streets) {
      const s = normalizeText(street);
      if (variants.some((v) => v === s || s.includes(v))) return street;
    }
  }
  return null;
}

/** מחזיר עותק של הנכס בשפת העמוד — כותרת ותיאור מתורגמים, fallback לעברית */
export function localizeListing(l: Listing, lang: string): Listing {
  if (lang === "he") return l;
  const tr = l.translations?.[lang];
  if (!tr) return l;
  return {
    ...l,
    title: tr.title ?? l.title,
    description: tr.description ?? l.description,
  };
}

export const formatListingPrice = (n: number | null, lang: Locale = "he") =>
  n == null ? DICTS[lang].misc.noInfo : formatPrice(n, lang);

export const LISTING_COLUMNS =
  "id, site_id, deal_type, title, description, translations, city, neighborhood, address, lat, lng, price, rooms, size_sqm, floor, has_mamad, has_elevator, has_parking, has_balcony, has_storage, storage_count, parking_count, tag, image_url, image_key, is_published, sort_order, created_at, updated_at";

/* ------------------------- מיון נכסים בתצוגה ------------------------- */

export type ListingSortKey = "newest" | "priceAsc" | "priceDesc" | "rooms" | "size";

/** ממיין נכסים לתצוגה. ברירת המחדל: לפי תאריך הוספה (חדש ביותר קודם). */
export function sortListings(list: Listing[], sort: ListingSortKey): Listing[] {
  const byNum = (
    get: (l: Listing) => number | null,
    dir: 1 | -1 = 1,
  ): ((a: Listing, b: Listing) => number) => {
    // ערכים חסרים תמיד בסוף, בכל כיוון מיון
    return (a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * dir;
    };
  };
  const sorted = [...list];
  switch (sort) {
    case "priceAsc":
      sorted.sort(byNum((l) => l.price, 1));
      break;
    case "priceDesc":
      sorted.sort(byNum((l) => l.price, -1));
      break;
    case "rooms":
      sorted.sort(byNum((l) => l.rooms, -1));
      break;
    case "size":
      sorted.sort(byNum((l) => l.size_sqm, -1));
      break;
    case "newest":
    default:
      sorted.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      break;
  }
  return sorted;
}
