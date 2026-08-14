import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ScoutProfile } from "@/lib/scout.server";

export type ScoutCandidateRow = {
  id: string;
  scout_profile_id: string | null;
  source_site: string;
  source_url: string;
  title: string;
  deal_type: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  neighborhood: string | null;
  address: string | null;
  raw_summary: string | null;
  match_score: number;
  match_reason: string | null;
  status: string;
  created_listing_id: string | null;
  created_at: string;
};

export type ScoutProfileRow = ScoutProfile & { created_at: string; updated_at: string };

const PROFILE_COLUMNS =
  "id,label,deal_type,city,neighborhoods,min_price,max_price,min_rooms,min_size,needs_mamad,needs_elevator,needs_parking,needs_balcony,sources,notes,is_active,last_run_at,created_at,updated_at";

const CANDIDATE_COLUMNS =
  "id,scout_profile_id,source_site,source_url,title,deal_type,price,rooms,size_sqm,neighborhood,address,raw_summary,match_score,match_reason,status,created_listing_id,created_at";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const str = (v: unknown, max = 200): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

const SOURCES = ["yad2", "madlan", "homeless", "komo", "winwin"];

export type ScoutProfileInput = {
  id?: string | null;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  min_size: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  sources: string[];
  notes: string | null;
  is_active: boolean;
};

function parseProfileInput(input: unknown): ScoutProfileInput {
  const i = (input ?? {}) as Record<string, unknown>;
  const deal = i["deal_type"] === "השכרה" ? "השכרה" : "מכירה";
  const hoods = Array.isArray(i["neighborhoods"])
    ? (i["neighborhoods"] as unknown[]).filter((h): h is string => typeof h === "string").slice(0, 20)
    : [];
  const sources = Array.isArray(i["sources"])
    ? (i["sources"] as unknown[]).filter((s): s is string => typeof s === "string" && SOURCES.includes(s))
    : [];
  return {
    id: str(i["id"], 60),
    label: str(i["label"], 80) ?? "סריקת נכסים",
    deal_type: deal,
    city: str(i["city"], 60) ?? "נתניה",
    neighborhoods: hoods,
    min_price: num(i["min_price"]),
    max_price: num(i["max_price"]),
    min_rooms: num(i["min_rooms"]),
    min_size: num(i["min_size"]),
    needs_mamad: i["needs_mamad"] === true,
    needs_elevator: i["needs_elevator"] === true,
    needs_parking: i["needs_parking"] === true,
    needs_balcony: i["needs_balcony"] === true,
    sources: sources.length ? sources : ["yad2", "madlan"],
    notes: str(i["notes"], 500),
    is_active: i["is_active"] !== false,
  };
}

/** רשימת פרופילי הסריקה של המנהל */
export const adminListScoutProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScoutProfileRow[]> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("scout_profiles")
      .select(PROFILE_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ScoutProfileRow[];
  });

/** שמירת פרופיל סריקה (יצירה או עדכון) */
export const adminSaveScoutProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parseProfileInput(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase.from("scout_profiles").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await context.supabase
      .from("scout_profiles")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

/** מחיקת פרופיל סריקה */
export const adminDeleteScoutProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { error } = await context.supabase.from("scout_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** רשימת מועמדים לפי סטטוס */
export const adminListScoutCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string }) => {
    const s = input?.status;
    return { status: s === "approved" || s === "rejected" || s === "new" ? s : "new" };
  })
  .handler(async ({ data, context }): Promise<ScoutCandidateRow[]> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("scout_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("status", data.status)
      .order("match_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ScoutCandidateRow[];
  });

/** מספר המועמדים החדשים שממתינים להחלטה */
export const adminScoutNewCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { count, error } = await context.supabase
      .from("scout_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

/** הרצת סריקה עכשיו — לכל הפרופילים הפעילים או לפרופיל מסוים */
export const adminRunScout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profileId?: string | null }) => ({ profileId: str(input?.profileId, 60) }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    let q = context.supabase.from("scout_profiles").select(PROFILE_COLUMNS).eq("is_active", true);
    if (data.profileId) q = q.eq("id", data.profileId);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    if (!profiles || profiles.length === 0) {
      return { scanned: 0, found: 0, inserted: 0, errors: ["אין פרופיל סריקה פעיל. הגדירו קריטריונים והפעילו אותם"] };
    }

    const { runScoutForProfiles } = await import("@/lib/scout-run.server");
    return runScoutForProfiles(
      context.supabase as never,
      profiles as unknown as ScoutProfile[],
      context.userId,
    );
  });

/** דחיית מועמד / החזרתו לרשימה */
export const adminSetCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    const status = input?.status === "rejected" || input?.status === "new" ? input.status : "new";
    return { id: String(input?.id ?? ""), status };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("scout_candidates")
      .update({ status: data.status, seen_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** אישור מועמד — יוצר טיוטת נכס לא מפורסמת לעריכה */
export const adminApproveCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const { data: c, error } = await context.supabase
      .from("scout_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const cand = c as unknown as ScoutCandidateRow;
    const source = `מקור: ${cand.source_site} — ${cand.source_url}`;
    const description = [cand.raw_summary, source].filter(Boolean).join("\n\n");

    const { data: listing, error: insErr } = await context.supabase
      .from("listings")
      .insert({
        title: cand.title,
        deal_type: cand.deal_type ?? "מכירה",
        description,
        city: "נתניה",
        neighborhood: cand.neighborhood,
        address: cand.address,
        price: cand.price,
        rooms: cand.rooms,
        size_sqm: cand.size_sqm,
        is_published: false,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    const { error: updErr } = await context.supabase
      .from("scout_candidates")
      .update({ status: "approved", created_listing_id: listing.id, seen_at: new Date().toISOString() })
      .eq("id", cand.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, listingId: listing.id as string };
  });
