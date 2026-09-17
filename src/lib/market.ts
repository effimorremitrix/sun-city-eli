import { matchesFilters, type Listing, type ListingFilters } from "@/lib/listings";

/**
 * מודעות מהשוק (market_listings) — מודול איזומורפי: טיפוס, עמודות לשליפה
 * והתאמה לפילטרים (אותם כללים כמו נכסי המשרד).
 */
export type MarketListing = {
  id: string;
  source: string;
  source_site: string | null;
  source_url: string;
  deal_type: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  title: string;
  description: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  floor: string | null;
  has_mamad: boolean | null;
  has_elevator: boolean | null;
  has_parking: boolean | null;
  has_balcony: boolean | null;
  image_url: string | null;
  match_score: number | null;
  /** מי פרסם את המודעה: משרד תיווך / מפרסם פרטי / לא ידוע */
  advertiser_type?: "agency" | "private" | "unknown";
  /** שם משרד התיווך כשדווח */
  agency_name?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active?: boolean;
  hidden_by_admin?: boolean;
};

export const MARKET_COLUMNS =
  "id, source, source_site, source_url, deal_type, city, neighborhood, address, title, description, price, rooms, size_sqm, floor, has_mamad, has_elevator, has_parking, has_balcony, image_url, match_score, advertiser_type, agency_name, first_seen_at, last_seen_at";

/**
 * מודעה שפורסמה על ידי משרד תיווך. האתר הציבורי מציג נכסי SUN CITY בלבד,
 * והאזור האישי מרחיב לנכסים של משרדי תיווך אחרים — אך לעולם לא למודעות
 * של מוכרים פרטיים. מודעה שלא הוכרע מי פרסם אותה ('unknown') אינה מוצגת:
 * עדיף לפספס מודעה מאשר להציג מודעה פרטית.
 */
export const isAgencyListing = (m: Pick<MarketListing, "advertiser_type">): boolean =>
  m.advertiser_type === "agency";

/** סינון רשימת מודעות למודעות תיווך בלבד */
export const agencyOnly = <T extends Pick<MarketListing, "advertiser_type">>(list: T[]): T[] =>
  list.filter(isAgencyListing);

/** מודעת שוק בצורת Listing — לסינון משותף (מתקן לא מדווח = לא נפסל) */
function asListing(m: MarketListing): Listing {
  return {
    id: m.id,
    site_id: null,
    deal_type: m.deal_type,
    title: m.title,
    description: m.description,
    city: m.city,
    neighborhood: m.neighborhood,
    address: m.address,
    lat: null,
    lng: null,
    price: m.price,
    rooms: m.rooms,
    size_sqm: m.size_sqm,
    floor: m.floor,
    has_mamad: m.has_mamad !== false,
    has_elevator: m.has_elevator !== false,
    has_parking: m.has_parking !== false,
    has_balcony: m.has_balcony !== false,
    has_storage: false,
    storage_count: null,
    parking_count: null,
    tag: null,
    image_url: m.image_url,
    image_key: null,
    is_published: true,
    sort_order: 0,
    created_at: m.first_seen_at,
    updated_at: m.last_seen_at,
  };
}

export function matchesMarketFilters(m: MarketListing, f: ListingFilters): boolean {
  return matchesFilters(asListing(m), f);
}

/** שם הלוח לתצוגה */
export const marketSourceLabel = (m: Pick<MarketListing, "source" | "source_site">) =>
  m.source_site ??
  { yad2: "יד2", komo: "קומו", madlan: "מדלן", homeless: "הומלס", winwin: "וין וין" }[m.source] ??
  m.source;

/**
 * כותרת מודעה בשפת הדף.
 *
 * מודעות מהלוחות נכתבות בעברית, וכך הן נשמרות. במקום לתרגם טקסט חופשי
 * בזמן אמת (יקר ולא צפוי), הכותרת נבנית מחדש מהשדות המובנים שכבר יש
 * לנו — סוג הנכס, מספר חדרים, כתובת ושכונה — כך שהיא מוצגת במלואה בשפת
 * הדף. שמות רחוב ושכונה נשארים כפי שהם (שמות פרטיים), בדיוק כמו באתרי
 * נדל"ן בין-לאומיים.
 */
export function localizeMarketTitle(
  m: Pick<MarketListing, "title" | "description" | "rooms" | "address" | "neighborhood">,
  dict: {
    maps: { propertyType: Record<string, string>; neighborhoods: Record<string, string> };
    properties: { roomsUnit: string };
  },
  lang: string,
  detect: (title: string | null | undefined, description?: string | null) => string,
): string {
  if (lang === "he") return m.title;
  const typeKey = detect(m.title, m.description);
  const head = dict.maps.propertyType[typeKey] ?? dict.maps.propertyType["apartment"] ?? "";
  const rooms = m.rooms != null ? `${m.rooms} ${dict.properties.roomsUnit}` : null;
  const hood = m.neighborhood ? (dict.maps.neighborhoods[m.neighborhood] ?? m.neighborhood) : null;
  const where = [m.address, hood].filter(Boolean).join(", ");
  const head2 = [head, rooms].filter(Boolean).join(" · ");
  return (where ? `${head2}, ${where}` : head2) || m.title;
}
