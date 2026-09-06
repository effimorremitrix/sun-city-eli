import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LiveTestimonial } from "@/lib/site-live";

/**
 * ============================================================
 * ממליצים (טבלת testimonials): היקף הצגה כללי (כל הדפים) או דפים מסוימים
 * (אחד או כמה). ציבורי: הרשימה של דף, כבר בשפת הדף. ניהול: אדמין רואה
 * ועורך הכול; סוכן — מה שהזין או שמשויך לדף שלו (RLS).
 * ============================================================
 */

export type TestimonialScope = "global" | "sites";

export type TestimonialRow = {
  id: string;
  name: string;
  type: string;
  quote: string;
  media_kind: "text" | "image" | "video";
  image_url: string | null;
  video_url: string | null;
  poster_url: string | null;
  scope: TestimonialScope;
  site_ids: string[];
  owner_site_id: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const TESTIMONIAL_COLUMNS =
  "id, name, type, quote, media_kind, image_url, video_url, poster_url, scope, site_ids, owner_site_id, is_published, sort_order, created_at, updated_at";

type PublicRow = {
  id: string;
  name: string;
  type: string;
  quote: string;
  mediaKind: "text" | "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  scope: TestimonialScope;
  translations: Record<string, { name?: string; type?: string; quote?: string } | undefined> | null;
  updatedAt: string;
};

/** הממליצים של דף (כלליים + משויכים), בשפה המבוקשת — ל-Testimonials.tsx */
export const listPublicTestimonials = createServerFn({ method: "GET" })
  .inputValidator((input?: { siteId?: string | null; lang?: string }) => ({
    siteId: input?.siteId ? String(input.siteId) : null,
    lang: ["he", "en", "fr", "ru"].includes(String(input?.lang)) ? String(input?.lang) : "he",
  }))
  .handler(async ({ data }): Promise<LiveTestimonial[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];
    const { data: rows, error } = await db.rpc("get_public_testimonials", {
      p_site_id: data.siteId,
    });
    if (error) {
      console.error("get_public_testimonials failed", error.message);
      return [];
    }
    return ((rows ?? []) as unknown as PublicRow[]).map((r) => {
      const tr = data.lang === "he" ? undefined : r.translations?.[data.lang];
      return {
        id: r.id,
        name: tr?.name ?? r.name,
        type: tr?.type ?? r.type,
        quote: tr?.quote ?? r.quote,
        mediaKind: r.mediaKind,
        ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
        ...(r.videoUrl ? { videoUrl: r.videoUrl } : {}),
        ...(r.posterUrl ? { posterUrl: r.posterUrl } : {}),
      };
    });
  });

/** רשימת הממליצים לניהול (RLS מסנן לסוכן) */
export const adminListTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TestimonialRow[]> => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { data, error } = await context.supabase
      .from("testimonials")
      .select(TESTIMONIAL_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TestimonialRow[];
  });

const HTTPS = /^https:\/\//;
const clean = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : "";
};
const cleanUrl = (v: unknown) => {
  const s = clean(v, 2000);
  return s && HTTPS.test(s) ? s : null;
};

export const adminSaveTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      type?: string;
      quote: string;
      mediaKind?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      posterUrl?: string | null;
      scope?: string;
      siteIds?: string[];
      /** הדף שממנו נערך (לסוכן: הדף שלו) */
      ownerSiteId?: string | null;
      isPublished?: boolean;
      sortOrder?: number;
    }) => {
      const name = clean(input?.name, 80);
      const quote = clean(input?.quote, 600);
      if (name.length < 1) throw new Error("נדרש שם ממליץ");
      if (quote.length < 2) throw new Error("נדרש תוכן ההמלצה");
      const mediaKind = ["text", "image", "video"].includes(String(input?.mediaKind))
        ? (String(input?.mediaKind) as TestimonialRow["media_kind"])
        : "text";
      return {
        id: input?.id ? String(input.id) : null,
        name,
        type: clean(input?.type, 60),
        quote,
        mediaKind,
        imageUrl: mediaKind === "image" ? cleanUrl(input?.imageUrl) : null,
        videoUrl: mediaKind === "video" ? cleanUrl(input?.videoUrl) : null,
        posterUrl: cleanUrl(input?.posterUrl),
        scope: input?.scope === "global" ? ("global" as const) : ("sites" as const),
        siteIds: Array.isArray(input?.siteIds) ? input.siteIds.map(String).slice(0, 30) : [],
        ownerSiteId: input?.ownerSiteId ? String(input.ownerSiteId) : null,
        isPublished: input?.isPublished !== false,
        sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input?.sortOrder) : 0,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);
    const ownIds = new Set(access.sites.map((s) => s.id));

    // סוכן: תמיד היקף "דפים" ורק הדף שלו; אדמין: חופשי
    let scope = data.scope;
    let siteIds = data.siteIds.filter((id) => access.isAdmin || ownIds.has(id));
    let ownerSiteId =
      data.ownerSiteId && (access.isAdmin || ownIds.has(data.ownerSiteId))
        ? data.ownerSiteId
        : null;
    if (!access.isAdmin) {
      scope = "sites";
      ownerSiteId = ownerSiteId ?? access.sites[0]?.id ?? null;
      if (!siteIds.length && ownerSiteId) siteIds = [ownerSiteId];
    }
    if (scope === "sites" && !siteIds.length) throw new Error("יש לבחור לפחות דף אחד להצגה");

    // תרגומים אוטומטיים (שם/סוג/ציטוט) — לפי hash של העברית
    let translations: Record<string, unknown> | undefined;
    try {
      const { autoTranslate } = await import("@/lib/translate.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let existing: Record<string, unknown> | undefined;
      if (data.id) {
        const { data: row } = await supabaseAdmin
          .from("testimonials")
          .select("translations")
          .eq("id", data.id)
          .maybeSingle();
        existing = (row?.translations as Record<string, unknown> | null) ?? undefined;
      }
      translations = (await autoTranslate(
        { name: data.name, type: data.type, quote: data.quote },
        existing as never,
        context.userId,
      )) as unknown as Record<string, unknown>;
    } catch (e) {
      console.error("testimonial autoTranslate failed", e instanceof Error ? e.message : e);
    }

    const fields = {
      name: data.name,
      type: data.type,
      quote: data.quote,
      media_kind: data.mediaKind,
      image_url: data.imageUrl,
      video_url: data.videoUrl,
      poster_url: data.posterUrl,
      scope,
      site_ids: scope === "global" ? [] : siteIds,
      owner_site_id: ownerSiteId,
      is_published: data.isPublished,
      sort_order: data.sortOrder,
      ...(translations ? { translations: translations as never } : {}),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("testimonials")
        .update(fields)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("testimonials")
      .insert({ ...fields, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const adminDeleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { error } = await context.supabase.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
