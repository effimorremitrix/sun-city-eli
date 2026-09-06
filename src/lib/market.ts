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
  first_seen_at: string;
  last_seen_at: string;
  is_active?: boolean;
  hidden_by_admin?: boolean;
};

export const MARKET_COLUMNS =
  "id, source, source_site, source_url, deal_type, city, neighborhood, address, title, description, price, rooms, size_sqm, floor, has_mamad, has_elevator, has_parking, has_balcony, image_url, match_score, first_seen_at, last_seen_at";

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
