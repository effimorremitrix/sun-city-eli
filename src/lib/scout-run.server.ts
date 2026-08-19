import { scoutProfileCandidates, type ScoutProfile } from "@/lib/scout.server";

type Db = { from: (t: string) => any };

/** מריץ סריקה לפרופילים ושומר מועמדים חדשים בלבד (לפי קישור המקור) */
export async function runScoutForProfiles(
  db: Db,
  profiles: ScoutProfile[],
  userId: string | null = null,
): Promise<{ scanned: number; found: number; inserted: number; errors: string[] }> {
  const { neighborhoods } = await import("@/lib/site-data");
  let found = 0;
  let inserted = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    try {
      const { candidates } = await scoutProfileCandidates(profile, [...neighborhoods], userId);
      found += candidates.length;

      for (const c of candidates) {
        const { data: existing } = await db
          .from("scout_candidates")
          .select("id")
          .eq("source_url", c.source_url)
          .maybeSingle();
        if (existing) continue;

        const { error } = await db.from("scout_candidates").insert({
          scout_profile_id: profile.id,
          source_site: c.source_site,
          source_url: c.source_url,
          title: c.title,
          deal_type: c.deal_type,
          price: c.price,
          rooms: c.rooms,
          size_sqm: c.size_sqm,
          neighborhood: c.neighborhood,
          address: c.address,
          has_mamad: c.has_mamad,
          has_elevator: c.has_elevator,
          has_parking: c.has_parking,
          has_balcony: c.has_balcony,
          raw_summary: c.raw_summary,
          match_score: c.match_score,
          match_reason: c.match_reason,
          status: "new",
        });
        if (!error) inserted += 1;
      }

      await db
        .from("scout_profiles")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", profile.id);
    } catch (err) {
      errors.push(`${profile.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { scanned: profiles.length, found, inserted, errors };
}
