import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchProfileSchema } from "@/lib/listing-schema";
import { LISTING_COLUMNS, type Listing } from "@/lib/listings";

export type SearchProfileRow = {
  id: string;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  rooms: number | null;
  max_rooms: number | null;
  street: string | null;
  min_size: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  notes: string | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
  whatsapp_phone: string | null;
  is_active: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  reason: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  /* תגובת הלקוח על ההתראה — 'interested' / 'wants_tour' / 'talk_to_me' */
  response: string | null;
  response_at: string | null;
  created_at: string;
  listing: Listing | null;
};

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [
      { data: isAdmin },
      { data: isSuperAdmin },
      { data: hasAgentRole },
      { data: ownedSites },
      { data: profile },
      { data: profiles },
      { data: notifications },
    ] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "agent" }),
      // בעלות על אתר היא ההגדרה שבה משתמש getAdminSite (src/lib/admin.server.ts).
      // בלי הבדיקה הזו סוכן שהאתר שלו הועבר אליו בלי שורה ב-user_roles לא היה
      // רואה בכלל את טאבי הניהול — ולא היה יכול, למשל, להעלות לוגו.
      supabase.from("sites").select("id").eq("owner_id", userId).limit(1),
      supabase.from("profiles").select("full_name").eq("id", userId).single(),
      supabase
        .from("search_profiles")
        .select(
          "id, label, deal_type, city, neighborhoods, min_price, max_price, min_rooms, rooms, max_rooms, street, min_size, needs_mamad, needs_elevator, needs_parking, needs_balcony, notes, notify_email, notify_whatsapp, whatsapp_phone, is_active, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("listing_notifications")
        .select(
          `id, reason, read_at, email_sent_at, response, response_at, created_at, listing:listing_id(${LISTING_COLUMNS})`,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      isAdmin: Boolean(isAdmin),
      isSuperAdmin: Boolean(isSuperAdmin),
      isAgent: Boolean(hasAgentRole) || (ownedSites ?? []).length > 0,
      fullName: profile?.full_name ?? null,
      profiles: (profiles ?? []) as unknown as SearchProfileRow[],
      notifications: (notifications ?? []) as unknown as NotificationRow[],
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = input as { full_name?: string };
    return { full_name: String(parsed.full_name ?? "").trim() };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMySearchProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase
        .from("search_profiles")
        .update(fields)
        .eq("id", id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await context.supabase
      .from("search_profiles")
      .insert({ ...fields, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const deleteMySearchProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("search_profiles")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("listing_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- התאמות, מועדפים והסוכן המטפל (האזור האישי) ---------------- */

import type { MatchResult } from "@/lib/match-score";

export type PortalMatch = {
  listing: Listing;
  match: MatchResult;
  /** שם הפרופיל שהניב את ההתאמה הטובה ביותר */
  profileLabel: string;
};

export type PortalAgent = {
  name: string;
  phone: string | null;
  phoneTel: string | null;
  photoUrl: string | null;
  slug: string | null;
};

export type PortalExtras = {
  matches: PortalMatch[];
  favorites: Listing[];
  /** מיפוי נכס → תגובות המשוב של הלקוח עליו */
  feedback: Record<string, string[]>;
  agent: PortalAgent | null;
};

/**
 * נתוני האזור האישי המורחב בקריאה אחת: נכסים מפורסמים מדורגים לפי אחוז
 * ההתאמה לפרופילים הפעילים של הלקוח, הנכסים ששמר, המשוב שנתן, והסוכן
 * המטפל בו (מהליד הפתוח האחרון; אם אין — סוכן המשרד).
 */
export const getMyPortalExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalExtras> => {
    const { supabase, userId } = context;
    const { scoreListingForProfile } = await import("@/lib/match-score");
    const { attachListingImages } = await import("@/lib/listing-images.server");

    const [{ data: profiles }, { data: rows }, { data: feedbackRows }, { data: leadRows }] =
      await Promise.all([
        supabase
          .from("search_profiles")
          .select(
            "id, label, deal_type, city, neighborhoods, min_price, max_price, min_rooms, rooms, max_rooms, street, min_size, needs_mamad, needs_elevator, needs_parking, needs_balcony",
          )
          .eq("user_id", userId)
          .eq("is_active", true),
        supabase
          .from("listings")
          .select(LISTING_COLUMNS)
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("listing_feedback")
          .select("listing_id, reaction")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("leads")
          .select("site_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    const listings = await attachListingImages((rows ?? []) as unknown as Listing[]);

    const feedback: Record<string, string[]> = {};
    for (const f of (feedbackRows ?? []) as Array<{ listing_id: string; reaction: string }>) {
      (feedback[f.listing_id] ??= []).push(f.reaction);
    }

    // התאמות: הציון הטוב ביותר מבין הפרופילים הפעילים; "לא מתאים לי" מוסתר
    const activeProfiles = (profiles ?? []) as Array<
      SearchProfileRow & { id: string; label: string }
    >;
    const matches: PortalMatch[] = [];
    if (activeProfiles.length) {
      for (const listing of listings) {
        if (feedback[listing.id]?.includes("not_relevant")) continue;
        let best: PortalMatch | null = null;
        for (const p of activeProfiles) {
          const match = scoreListingForProfile(p, listing);
          if (match.score == null) continue;
          if (!best || (best.match.score ?? 0) < match.score) {
            best = { listing, match, profileLabel: p.label };
          }
        }
        if (best && (best.match.score ?? 0) >= 40) matches.push(best);
      }
      matches.sort((a, b) => (b.match.score ?? 0) - (a.match.score ?? 0));
    }

    const favoriteIds = new Set(
      Object.entries(feedback)
        .filter(([, reactions]) => reactions.includes("favorite"))
        .map(([id]) => id),
    );
    const favorites = listings.filter((l) => favoriteIds.has(l.id));

    // הסוכן המטפל: ה-site של הליד האחרון של הלקוח; אחרת אתר המשרד
    let agent: PortalAgent | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { OFFICE_SLUG } = await import("@/lib/site-data");
      let siteId = (leadRows?.[0]?.site_id as string | undefined) ?? null;
      if (!siteId) {
        const { data: office } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("slug", OFFICE_SLUG)
          .maybeSingle();
        siteId = (office?.id as string | undefined) ?? null;
      }
      if (siteId) {
        const [{ data: site }, { data: content }] = await Promise.all([
          supabaseAdmin.from("sites").select("slug").eq("id", siteId).maybeSingle(),
          supabaseAdmin.from("site_content").select("business").eq("site_id", siteId).maybeSingle(),
        ]);
        const business = (content?.business ?? {}) as {
          agentName?: string;
          name?: string;
          phone?: string;
          phoneTel?: string;
          photoUrl?: string;
        };
        agent = {
          name: business.agentName || business.name || "Sun City",
          phone: business.phone ?? null,
          phoneTel: business.phoneTel ?? null,
          photoUrl: business.photoUrl ?? null,
          slug: (site?.slug as string | undefined) ?? null,
        };
      }
    } catch (e) {
      console.error("portal agent lookup failed", e instanceof Error ? e.message : e);
    }

    return { matches: matches.slice(0, 30), favorites, feedback, agent };
  });
