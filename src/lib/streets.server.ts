import { mergeStreets, SEED_STREETS } from "@/lib/streets";

/**
 * רשימת הרחובות המוכרים לחיפוש: הרחובות המרכזיים של נתניה, כתובות נכסי
 * המשרד וכתובות המודעות שנסרקו מהלוחות. נשלפת דרך get_known_streets
 * (SECURITY DEFINER) ונשמרת במטמון קצר — היא משתנה לאט.
 *
 * כישלון בשליפה אינו מפיל את החיפוש: נשארים עם הזרע ועם מה שהועבר.
 */
const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; value: string[] } | null = null;

async function fetchDbStreets(city = "נתניה"): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];
    const { data, error } = await db.rpc("get_known_streets", { p_city: city });
    if (error) {
      console.error("get_known_streets failed", error.message);
      return cache?.value ?? [];
    }
    const value = Array.isArray(data) ? (data as unknown[]).map(String) : [];
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("get_known_streets failed", e instanceof Error ? e.message : e);
    return cache?.value ?? [];
  }
}

/** אוצר הרחובות המלא — extra הוא רחובות שכבר נגזרו מנכסי המשרד בקריאה */
export async function knownStreets(extra: readonly string[] = []): Promise<string[]> {
  const fromDb = await fetchDbStreets();
  return mergeStreets(extra, fromDb, SEED_STREETS);
}
