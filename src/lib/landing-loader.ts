import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings, listPublicAgents } from "@/lib/listings.functions";
import type { Lang } from "@/lib/i18n";

/**
 * טעינת הנתונים המשותפת לכל דפי הנחיתה (בכל שפה): תוכן ה-site,
 * הנכסים (מתורגמים לשפת הדף) ורשימת הסוכנים.
 * ללא slug — הדף הראשי עם כלל הנכסים של כל הסוכנים.
 */
export async function loadLanding(slug: string | null, lang: Lang = "he") {
  const [live, listings, agents] = await Promise.all([
    slug ? getPublicSite({ data: { slug } }) : getPublicSite(),
    listPublicListings({ data: { slug, lang } }),
    listPublicAgents(),
  ]);
  return { live, listings, agents };
}
