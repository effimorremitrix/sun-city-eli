/* ============================================================
 * גיאוקוד כתובות — כתובת חופשית לקואורדינטות, לתצוגת המפה.
 *
 * המקור: Nominatim של OpenStreetMap (חינמי, בלי מפתח). מדיניות השימוש שלהם
 * מחייבת User-Agent מזהה ולכל היותר בקשה אחת לשנייה — ולכן כאן יש גם
 * geocodeMany שמכבד את הקצב.
 *
 * כלל ברזל: כשלא נמצאה כתובת — מחזירים null. לא מנחשים קואורדינטה משוערת,
 * כי נעץ במקום הלא נכון גרוע יותר מנכס שלא מופיע על המפה.
 * ============================================================ */

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "sun-city-realestate/1.0 (https://sun-city.company)";

/** קצב הבקשות המרבי המותר במדיניות של Nominatim */
export const GEOCODE_MIN_INTERVAL_MS = 1100;

export type Coords = { lat: number; lng: number };

export type GeocodeInput = {
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
};

const clean = (v: string | null | undefined) => v?.trim() || null;

/** בונה את שאילתות החיפוש, מהמדויקת ביותר לרחבה ביותר */
function queriesFor({ address, neighborhood, city }: GeocodeInput): string[] {
  const addr = clean(address);
  const hood = clean(neighborhood);
  const town = clean(city) ?? "נתניה";

  const queries: string[] = [];
  if (addr) {
    // אם הכתובת כבר כוללת את העיר — לא מכפילים אותה
    queries.push(addr.includes(town) ? addr : `${addr}, ${town}`);
  }
  // שכונה בלבד היא קירוב לגיטימי ומוצהר, ולכן מותרת כניסיון שני
  if (hood) queries.push(`${hood}, ${town}`);
  return queries;
}

async function lookup(query: string): Promise<Coords | null> {
  const url = `${ENDPOINT}?format=json&limit=1&countrycodes=il&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) {
      console.error("geocode failed", res.status, query);
      return null;
    }
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = Array.isArray(rows) ? rows[0] : undefined;
    if (!first?.lat || !first.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (e) {
    console.error("geocode error", e instanceof Error ? e.message : e, query);
    return null;
  }
}

/** מאתר קואורדינטות לנכס. null = לא נמצא מיקום, והנכס לא יוצג על המפה. */
export async function geocodeListing(input: GeocodeInput): Promise<Coords | null> {
  for (const query of queriesFor(input)) {
    const hit = await lookup(query);
    if (hit) return hit;
  }
  return null;
}

/** גיאוקוד לרשימה, בקצב שמדיניות Nominatim מתירה (בקשה אחת לשנייה) */
export async function geocodeMany<T extends GeocodeInput & { id: string }>(
  items: T[],
): Promise<Array<{ id: string; coords: Coords | null }>> {
  const out: Array<{ id: string; coords: Coords | null }> = [];
  for (const [i, item] of items.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, GEOCODE_MIN_INTERVAL_MS));
    out.push({ id: item.id, coords: await geocodeListing(item) });
  }
  return out;
}
