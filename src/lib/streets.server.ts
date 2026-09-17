import { mergeStreets } from "@/lib/streets";
import { NETANYA_STREETS } from "@/lib/netanya-streets";

/**
 * רשימת הרחובות לחיפוש: הרשימה הרשמית של משרד הפנים (1048 רחובות בנתניה)
 * ועליה כתובות נכסי המשרד והמודעות שנסרקו, דרך get_known_streets
 * (SECURITY DEFINER) עם מטמון קצר.
 *
 * הסדר חשוב: הכתובות מהמסד קודמות כדי לשמר את הכתיב שבו הנכס נשמר, ומה
 * שלא הופיע בהן מגיע מהמאגר הממשלתי. כישלון בשליפה מהמסד אינו פוגע
 * בחיפוש — הרשימה הרשמית עומדת בפני עצמה.
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
  return mergeStreets(extra, fromDb, NETANYA_STREETS);
}

/**
 * הרשימה הרשמית בלבד, בלי פנייה למסד — לשימושים שבהם אסור שכישלון
 * במסד יחזיר רשימה קצרה (למשל הצעות ההשלמה בטופס פרופיל החיפוש).
 */
export function officialStreets(): string[] {
  return mergeStreets(NETANYA_STREETS);
}
