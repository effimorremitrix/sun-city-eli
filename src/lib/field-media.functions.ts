import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * ============================================================
 * "מהשטח" (field_media): סרטונים ותמונות מעסקאות — חתימות, מסירת מפתחות,
 * לקוחות מרוצים, המשרד. היקף כללי או לדפים מסוימים, כמו הממליצים.
 * ============================================================
 */

export const FIELD_CATEGORIES = [
  "signing",
  "deal_closed",
  "keys",
  "happy_clients",
  "office",
  "other",
] as const;
export type FieldCategory = (typeof FIELD_CATEGORIES)[number];

export type FieldMediaItem = {
  id: string;
  title: string;
  description: string | null;
  category: FieldCategory;
  mediaKind: "video" | "image";
  mediaUrl: string;
  posterUrl: string | null;
  happenedAt: string | null;
};

export type FieldMediaRow = {
  id: string;
  title: string;
  description: string | null;
  category: FieldCategory;
  media_kind: "video" | "image";
  media_url: string;
  poster_url: string | null;
  scope: "global" | "sites";
  site_ids: string[];
  owner_site_id: string | null;
  is_published: boolean;
  sort_order: number;
  happened_at: string | null;
  created_at: string;
};

const COLUMNS =
  "id, title, description, category, media_kind, media_url, poster_url, scope, site_ids, owner_site_id, is_published, sort_order, happened_at, created_at";

type PublicRow = {
  id: string;
  title: string;
  description: string | null;
  category: FieldCategory;
  mediaKind: "video" | "image";
  mediaUrl: string;
  posterUrl: string | null;
  happenedAt: string | null;
  translations: Record<string, { title?: string; description?: string } | undefined> | null;
};

/** הסרטונים של דף (כלליים + משויכים), בשפת הדף */
export const listPublicFieldMedia = createServerFn({ method: "GET" })
  .inputValidator((input?: { siteId?: string | null; lang?: string }) => ({
    siteId: input?.siteId ? String(input.siteId) : null,
    lang: ["he", "en", "fr", "ru"].includes(String(input?.lang)) ? String(input?.lang) : "he",
  }))
  .handler(async ({ data }): Promise<FieldMediaItem[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];
    const { data: rows, error } = await db.rpc("get_public_field_media", {
      p_site_id: data.siteId,
    });
    if (error) {
      console.error("get_public_field_media failed", error.message);
      return [];
    }
    return ((rows ?? []) as unknown as PublicRow[]).map((r) => {
      const tr = data.lang === "he" ? undefined : r.translations?.[data.lang];
      return {
        id: r.id,
        title: tr?.title ?? r.title,
        description: tr?.description ?? r.description,
        category: r.category,
        mediaKind: r.mediaKind,
        mediaUrl: r.mediaUrl,
        posterUrl: r.posterUrl,
        happenedAt: r.happenedAt,
      };
    });
  });

export const adminListFieldMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FieldMediaRow[]> => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { data, error } = await context.supabase
      .from("field_media")
      .select(COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FieldMediaRow[];
  });

const clean = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : "";
};
const cleanUrl = (v: unknown) => {
  const s = clean(v, 2000);
  return s && /^https:\/\//.test(s) ? s : null;
};

export const adminSaveFieldMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      title: string;
      description?: string | null;
      category?: string;
      mediaKind?: string;
      mediaUrl: string;
      posterUrl?: string | null;
      scope?: string;
      siteIds?: string[];
      ownerSiteId?: string | null;
      isPublished?: boolean;
      sortOrder?: number;
      happenedAt?: string | null;
    }) => {
      const title = clean(input?.title, 120);
      if (title.length < 2) throw new Error("נדרשת כותרת");
      const mediaUrl = cleanUrl(input?.mediaUrl);
      if (!mediaUrl) throw new Error("נדרש קובץ סרטון/תמונה (https)");
      const happened = clean(input?.happenedAt, 10);
      return {
        id: input?.id ? String(input.id) : null,
        title,
        description: clean(input?.description, 600) || null,
        category: (FIELD_CATEGORIES as readonly string[]).includes(String(input?.category))
          ? (String(input?.category) as FieldCategory)
          : ("other" as FieldCategory),
        mediaKind: input?.mediaKind === "image" ? ("image" as const) : ("video" as const),
        mediaUrl,
        posterUrl: cleanUrl(input?.posterUrl),
        scope: input?.scope === "sites" ? ("sites" as const) : ("global" as const),
        siteIds: Array.isArray(input?.siteIds) ? input.siteIds.map(String).slice(0, 30) : [],
        ownerSiteId: input?.ownerSiteId ? String(input.ownerSiteId) : null,
        isPublished: input?.isPublished !== false,
        sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input?.sortOrder) : 0,
        happenedAt: /^\d{4}-\d{2}-\d{2}$/.test(happened) ? happened : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);
    const ownIds = new Set(access.sites.map((s) => s.id));
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

    let translations: Record<string, unknown> | undefined;
    try {
      const { autoTranslate } = await import("@/lib/translate.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let existing: Record<string, unknown> | undefined;
      if (data.id) {
        const { data: row } = await supabaseAdmin
          .from("field_media")
          .select("translations")
          .eq("id", data.id)
          .maybeSingle();
        existing = (row?.translations as Record<string, unknown> | null) ?? undefined;
      }
      translations = (await autoTranslate(
        { title: data.title, description: data.description ?? "" },
        existing as never,
        context.userId,
      )) as unknown as Record<string, unknown>;
    } catch (e) {
      console.error("field media autoTranslate failed", e instanceof Error ? e.message : e);
    }

    const fields = {
      title: data.title,
      description: data.description,
      category: data.category,
      media_kind: data.mediaKind,
      media_url: data.mediaUrl,
      poster_url: data.posterUrl,
      scope,
      site_ids: scope === "global" ? [] : siteIds,
      owner_site_id: ownerSiteId,
      is_published: data.isPublished,
      sort_order: data.sortOrder,
      happened_at: data.happenedAt,
      ...(translations ? { translations: translations as never } : {}),
    };
    if (data.id) {
      const { error } = await context.supabase.from("field_media").update(fields).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("field_media")
      .insert({ ...fields, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const adminDeleteFieldMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { error } = await context.supabase.from("field_media").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
