import type { Listing, ListingAgent } from "@/lib/listings";
import { OFFICE_SLUG, SITE_CONFIG, team } from "@/lib/site-data";

/** ה-slug של האתר הראשי (הדף של אלי) — נכסים ישנים ללא site_id שייכים אליו */
export const DEFAULT_SLUG = OFFICE_SLUG;

export type PublicAgentRow = {
  id: string;
  slug: string;
  name: string;
  agent_name: string | null;
  role_title: string | null;
  photo_url: string | null;
  phone: string | null;
  phone_tel: string | null;
};

/** רשימת הסוכנים הפעילים (sites) מהמסד — ריק כשאין חיבור */
export async function fetchPublicAgents(): Promise<PublicAgentRow[]> {
  const { publicDb } = await import("@/lib/public-db.server");
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db.rpc("get_public_agents");
  if (error) {
    console.error("get_public_agents failed", error.message);
    return [];
  }
  return Array.isArray(data) ? (data as unknown as PublicAgentRow[]) : [];
}

const toListingAgent = (a: PublicAgentRow): ListingAgent => ({
  slug: a.slug,
  name: a.agent_name || a.name,
  phone: a.phone,
  phoneTel: a.phone_tel,
  photoUrl: a.photo_url,
});

/** ברירת מחדל כשאין רשומת site במסד — אלי כליף */
const DEFAULT_AGENT: ListingAgent = {
  slug: DEFAULT_SLUG,
  name: team[0]!.name,
  phone: SITE_CONFIG.phone,
  phoneTel: SITE_CONFIG.phoneTel,
  photoUrl: team[0]!.image ?? null,
};

/**
 * מצמיד לכל נכס את הסוכן שאליו הפניות עליו ינותבו.
 *
 * pageSlug — הסוכן של הדף האישי שבו אנחנו נמצאים. מלאי הנכסים משותף לכל
 * הסוכנים, ולכן בדף אישי כל הנכסים מיוחסים לסוכן של הדף: גולש שהגיע דרך
 * הדף של סוכן מסוים מדבר איתו, גם על נכס שסוכן אחר העלה.
 * בלי pageSlug (עמוד הבית של המשרד) כל נכס מיוחס לסוכן שפרסם אותו.
 */
export async function attachListingAgents(
  listings: Listing[],
  pageSlug?: string | null,
): Promise<Listing[]> {
  if (!listings.length) return listings;
  const agents = await fetchPublicAgents();

  if (pageSlug) {
    const pageAgent = agents.filter((a) => a.slug === pageSlug).map(toListingAgent)[0];
    if (pageAgent) return listings.map((l) => ({ ...l, agent: pageAgent }));
  }

  const bySite = new Map(agents.map((a) => [a.id, toListingAgent(a)]));
  const defaultAgent =
    agents.filter((a) => a.slug === DEFAULT_SLUG).map(toListingAgent)[0] ?? DEFAULT_AGENT;
  return listings.map((l) => ({
    ...l,
    agent: (l.site_id && bySite.get(l.site_id)) || defaultAgent,
  }));
}
