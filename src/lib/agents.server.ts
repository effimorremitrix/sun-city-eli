import type { Listing, ListingAgent } from "@/lib/listings";
import { SITE_CONFIG, team } from "@/lib/site-data";

/** ה-slug של האתר הראשי (הדף של אלי) — נכסים ישנים ללא site_id שייכים אליו */
export const DEFAULT_SLUG = "sun-city";

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
 * מצמיד לכל נכס את הסוכן שאליו הוא משויך, כדי שכל פנייה מהאתר
 * תנותב לסוכן של הנכס ולא לסוכן של הדף.
 */
export async function attachListingAgents(listings: Listing[]): Promise<Listing[]> {
  if (!listings.length) return listings;
  const agents = await fetchPublicAgents();
  const bySite = new Map(agents.map((a) => [a.id, toListingAgent(a)]));
  const defaultAgent =
    agents.filter((a) => a.slug === DEFAULT_SLUG).map(toListingAgent)[0] ?? DEFAULT_AGENT;
  return listings.map((l) => ({
    ...l,
    agent: (l.site_id && bySite.get(l.site_id)) || defaultAgent,
  }));
}
