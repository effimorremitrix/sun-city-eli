import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";
import prop7 from "@/assets/prop-7.jpg";
import prop8 from "@/assets/prop-8.jpg";

/** נכס כפי שהוא נשמר במסד הנתונים ומוצג באתר */
export type Listing = {
  id: string;
  deal_type: string;
  title: string;
  description: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  floor: string | null;
  has_mamad: boolean;
  has_elevator: boolean;
  has_parking: boolean;
  has_balcony: boolean;
  tag: string | null;
  image_url: string | null;
  image_key: string | null;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
};

/** פילטרים מובנים — משמשים גם את החיפוש הידני וגם את חיפוש ה‑AI */
export type ListingFilters = {
  deal_type?: string | null;
  neighborhoods?: string[];
  min_price?: number | null;
  max_price?: number | null;
  min_rooms?: number | null;
  min_size?: number | null;
  needs_mamad?: boolean;
  needs_elevator?: boolean;
  needs_parking?: boolean;
  needs_balcony?: boolean;
};

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

/** תמונת הנכס: קודם כתובת שהוזנה בניהול, אחרת תמונה מקומית לפי המזהה */
export function listingImage(l: Pick<Listing, "image_url" | "image_key">): string | null {
  if (l.image_url && l.image_url.trim()) return l.image_url;
  if (l.image_key && LOCAL_IMAGES[l.image_key]) return LOCAL_IMAGES[l.image_key]!;
  return null;
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
  if (f.neighborhoods?.length && !(l.neighborhood && f.neighborhoods.includes(l.neighborhood))) return false;
  if (f.min_price != null && l.price != null && l.price < f.min_price) return false;
  if (f.max_price != null && l.price != null && l.price > f.max_price) return false;
  if (f.min_rooms != null && l.rooms != null && l.rooms < f.min_rooms) return false;
  if (f.min_size != null && l.size_sqm != null && l.size_sqm < f.min_size) return false;
  if (f.needs_mamad && !l.has_mamad) return false;
  if (f.needs_elevator && !l.has_elevator) return false;
  if (f.needs_parking && !l.has_parking) return false;
  if (f.needs_balcony && !l.has_balcony) return false;
  return true;
}

export const formatListingPrice = (n: number | null) =>
  n == null ? "אין מידע" : `${n.toLocaleString("he-IL")} ₪`;

export const LISTING_COLUMNS =
  "id, deal_type, title, description, city, neighborhood, address, price, rooms, size_sqm, floor, has_mamad, has_elevator, has_parking, has_balcony, tag, image_url, image_key, is_published, sort_order, updated_at";
