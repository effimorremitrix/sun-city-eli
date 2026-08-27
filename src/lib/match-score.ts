import type { Listing } from "@/lib/listings";

/**
 * ============================================================
 * אחוז התאמה בין פרופיל חיפוש לנכס — מודול טהור (רץ בשרת ובדפדפן).
 *
 * הסמנטיקה עקבית עם match_listing_to_profiles (ה-RPC של ההתראות)
 * ועם matchesFilters של הסינון: ערך שלא הוגדר בפרופיל אינו נספר,
 * ונתון חסר בנכס לא מכשיל (כמו ב-RPC: מחיר NULL תואם כל תקציב) —
 * אבל כן מוריד את הביטחון בציון. "קנייה" בפרופיל תואמת נכסי "מכירה".
 *
 * הציון: ממוצע משוקלל של הקריטריונים שהוגדרו. breakdown מפרט כל
 * קריטריון ✓/✗/כמעט — כדי שהלקוח יבין למה הנכס הוצע לו.
 * ============================================================
 */

export type MatchProfile = {
  deal_type?: string | null;
  city?: string | null;
  neighborhoods?: string[] | null;
  street?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  rooms?: number | null;
  min_rooms?: number | null;
  max_rooms?: number | null;
  min_size?: number | null;
  needs_mamad?: boolean;
  needs_elevator?: boolean;
  needs_parking?: boolean;
  needs_balcony?: boolean;
};

export type MatchCriterion = {
  key:
    | "deal"
    | "city"
    | "neighborhood"
    | "street"
    | "price"
    | "rooms"
    | "size"
    | "mamad"
    | "elevator"
    | "parking"
    | "balcony";
  /** full = ✓, near = קרוב (למשל מחיר מעט מעל התקציב), miss = ✗, unknown = אין נתון בנכס */
  level: "full" | "near" | "miss" | "unknown";
};

export type MatchResult = {
  /** 0–100; null כשאין אף קריטריון מוגדר בפרופיל */
  score: number | null;
  breakdown: MatchCriterion[];
};

/** משקולות — שכונה, תקציב וחדרים חשובים יותר ממאפייני נוחות */
const WEIGHTS: Record<MatchCriterion["key"], number> = {
  deal: 3,
  city: 1,
  neighborhood: 3,
  street: 2,
  price: 3,
  rooms: 3,
  size: 2,
  mamad: 1,
  elevator: 1,
  parking: 1,
  balcony: 1,
};

const LEVEL_VALUE: Record<MatchCriterion["level"], number> = {
  full: 1,
  near: 0.6,
  unknown: 0.5,
  miss: 0,
};

const normDeal = (v: string | null | undefined) => (v === "קנייה" ? "מכירה" : (v ?? null));

export function scoreListingForProfile(profile: MatchProfile, listing: Listing): MatchResult {
  const breakdown: MatchCriterion[] = [];
  const add = (key: MatchCriterion["key"], level: MatchCriterion["level"]) =>
    breakdown.push({ key, level });

  const dealWanted = normDeal(profile.deal_type);
  if (dealWanted) add("deal", listing.deal_type === dealWanted ? "full" : "miss");

  if (profile.city && profile.city.trim()) {
    add("city", listing.city === profile.city ? "full" : "miss");
  }

  const hoods = profile.neighborhoods ?? [];
  if (hoods.length) {
    if (!listing.neighborhood) add("neighborhood", "unknown");
    else add("neighborhood", hoods.includes(listing.neighborhood) ? "full" : "miss");
  }

  if (profile.street && profile.street.trim()) {
    const street = profile.street.trim();
    add(
      "street",
      listing.address && listing.address.includes(street)
        ? "full"
        : listing.address
          ? "miss"
          : "unknown",
    );
  }

  const hasBudget = profile.min_price != null || profile.max_price != null;
  if (hasBudget) {
    if (listing.price == null) add("price", "unknown");
    else {
      const aboveMax = profile.max_price != null && listing.price > profile.max_price;
      const belowMin = profile.min_price != null && listing.price < profile.min_price;
      if (!aboveMax && !belowMin) add("price", "full");
      // עד 10% מעל התקציב = "כמעט" — הלקוח מבין שהמחיר מעט מעל
      else if (aboveMax && profile.max_price != null && listing.price <= profile.max_price * 1.1)
        add("price", "near");
      else add("price", "miss");
    }
  }

  const wantsRooms =
    profile.rooms != null || profile.min_rooms != null || profile.max_rooms != null;
  if (wantsRooms) {
    if (listing.rooms == null) add("rooms", "unknown");
    else {
      const r = listing.rooms;
      let ok = true;
      let near = false;
      if (profile.rooms != null) {
        ok = Math.abs(r - profile.rooms) <= 0.5;
        near = !ok && Math.abs(r - profile.rooms) <= 1;
      }
      if (ok && profile.min_rooms != null) {
        ok = r >= profile.min_rooms;
        near = !ok && r >= profile.min_rooms - 0.5;
      }
      if (ok && profile.max_rooms != null) {
        ok = r <= profile.max_rooms;
        near = !ok && r <= profile.max_rooms + 0.5;
      }
      add("rooms", ok ? "full" : near ? "near" : "miss");
    }
  }

  if (profile.min_size != null) {
    if (listing.size_sqm == null) add("size", "unknown");
    else if (listing.size_sqm >= profile.min_size) add("size", "full");
    else if (listing.size_sqm >= profile.min_size * 0.9) add("size", "near");
    else add("size", "miss");
  }

  if (profile.needs_mamad) add("mamad", listing.has_mamad ? "full" : "miss");
  if (profile.needs_elevator) add("elevator", listing.has_elevator ? "full" : "miss");
  if (profile.needs_parking) add("parking", listing.has_parking ? "full" : "miss");
  if (profile.needs_balcony) add("balcony", listing.has_balcony ? "full" : "miss");

  if (!breakdown.length) return { score: null, breakdown };

  let total = 0;
  let max = 0;
  for (const c of breakdown) {
    total += WEIGHTS[c.key] * LEVEL_VALUE[c.level];
    max += WEIGHTS[c.key];
  }
  return { score: Math.round((total / max) * 100), breakdown };
}
