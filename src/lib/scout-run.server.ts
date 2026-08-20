import { scoutProfileCandidates, type ScoutProfile } from "@/lib/scout.server";

type Db = { from: (t: string) => any };

/** סיכום סריקה של פרופיל אחד — מוצג בלוח הניהול ונשמר על שורת הפרופיל */
export type ScoutProfileRunSummary = {
  id: string;
  label: string;
  sources: string[];
  /** מודעות שעברו את כל הקריטריונים */
  found: number;
  /** מתוכן — נשמרו כמועמדים חדשים */
  inserted: number;
  /** מודעות שכבר היו ברשימת המועמדים (לפי קישור המקור) */
  duplicates: number;
  /** מודעות שנמצאו בחיפוש ונפסלו בסינון */
  filtered: number;
  /** הסיבות לפסילה, מרוכזות לפי סוג ומסודרות מהשכיחה לנדירה */
  reasons: string[];
  /** שגיאה שעצרה את הסריקה של הפרופיל הזה */
  error: string | null;
};

export type ScoutRunResult = {
  scanned: number;
  found: number;
  inserted: number;
  errors: string[];
  profiles: ScoutProfileRunSummary[];
};

/** מרכז סיבות פסילה זהות: ["4 חדרים — פחות מהנדרש", …] → ["3× 4 חדרים — פחות מהנדרש"] */
function summarizeReasons(reasons: string[]): string[] {
  const counts = new Map<string, number>();
  for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([reason, count]) => (count > 1 ? `${count}× ${reason}` : reason));
}

/** מריץ סריקה לפרופילים ושומר מועמדים חדשים בלבד (לפי קישור המקור) */
export async function runScoutForProfiles(
  db: Db,
  profiles: ScoutProfile[],
  userId: string | null = null,
): Promise<ScoutRunResult> {
  const { neighborhoods } = await import("@/lib/site-data");
  let found = 0;
  let inserted = 0;
  const errors: string[] = [];
  const summaries: ScoutProfileRunSummary[] = [];

  for (const profile of profiles) {
    const summary: ScoutProfileRunSummary = {
      id: profile.id,
      label: profile.label,
      sources: profile.sources ?? [],
      found: 0,
      inserted: 0,
      duplicates: 0,
      filtered: 0,
      reasons: [],
      error: null,
    };

    try {
      const { candidates, rejected } = await scoutProfileCandidates(
        profile,
        [...neighborhoods],
        userId,
      );
      found += candidates.length;
      summary.found = candidates.length;
      summary.filtered = rejected.length;
      summary.reasons = summarizeReasons(rejected.map((r) => r.reason));

      for (const c of candidates) {
        const { data: existing } = await db
          .from("scout_candidates")
          .select("id")
          .eq("source_url", c.source_url)
          .maybeSingle();
        if (existing) {
          summary.duplicates += 1;
          continue;
        }

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
        if (error) {
          // כשל שמירה אינו "אפס תוצאות" — בלי הדיווח הזה הסריקה נראית מוצלחת
          errors.push(`${profile.label}: שמירת מועמד נכשלה — ${error.message ?? String(error)}`);
          continue;
        }
        inserted += 1;
        summary.inserted += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.error = message;
      errors.push(`${profile.label}: ${message}`);
    }

    // הסיכום נשמר על שורת הפרופיל כדי שיישאר גלוי אחרי רענון דף וגם אחרי
    // סריקת ה-cron הלילית, לא רק בהודעה החולפת אחרי לחיצה על "סרוק"
    await db
      .from("scout_profiles")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_found: summary.found,
        last_run_inserted: summary.inserted,
        last_run_skipped: summary.duplicates + summary.filtered,
        last_run_note:
          summary.error ??
          (summary.reasons.length ? summary.reasons.join(" · ").slice(0, 500) : null),
      })
      .eq("id", profile.id);

    summaries.push(summary);
  }

  return { scanned: profiles.length, found, inserted, errors, profiles: summaries };
}
