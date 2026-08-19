import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** דירה שנמכרה — מוצגת במדור "נמכר על ידינו" */
export type SoldProperty = {
  id: string;
  site_id: string;
  address: string;
  neighborhood: string | null;
  note: string | null;
  sold_at: string | null;
  is_published: boolean;
  sort_order: number;
  /** כתובת התמונה להצגה (חתומה כשהקובץ באחסון) */
  url: string | null;
  storage_path: string | null;
  image_url: string | null;
};

const COLUMNS =
  "id, site_id, address, neighborhood, note, image_url, storage_path, sold_at, is_published, sort_order";

const BUCKET = "listing-images";
const SIGNED_TTL = 60 * 60 * 24 * 7; // שבוע

type RawRow = {
  id: string;
  site_id: string;
  address: string;
  neighborhood: string | null;
  note: string | null;
  image_url: string | null;
  storage_path: string | null;
  sold_at: string | null;
  is_published: boolean;
  sort_order: number;
};

/** מצרף כתובות תמונה חתומות לרשומות (אותו דפוס כמו תמונות הנכסים) */
async function withUrls(rows: RawRow[]): Promise<SoldProperty[]> {
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: urls, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_TTL);
    if (error) console.error("sold createSignedUrls failed", error.message);
    for (const item of urls ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
    }
  }
  return rows.map((r) => ({
    ...r,
    url: (r.storage_path ? signed.get(r.storage_path) : null) ?? r.image_url,
  }));
}

/**
 * הדירות שנמכרו להצגה ציבורית — היסטוריית המכירות של כל המשרד, בכל הדפים.
 * כמו הנכסים, זו הוכחה חברתית משותפת ולא רשימה אישית לכל סוכן.
 */
export const listPublicSoldProperties = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<SoldProperty[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];

    const query = db
      .from("sold_properties")
      .select(COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("sold_at", { ascending: false });

    const { data: rows, error } = await query.limit(24);
    if (error) {
      console.error("listPublicSoldProperties failed", error.message);
      return [];
    }
    return withUrls((rows ?? []) as unknown as RawRow[]);
  });

/* ------------------ ניהול (אדמין או סוכן, לפי ה-site) ------------------ */

export const adminListSoldProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => input)
  .handler(async ({ data, context }): Promise<SoldProperty[]> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { data: rows, error } = await context.supabase
      .from("sold_properties")
      .select(COLUMNS)
      .eq("site_id", data.siteId)
      .order("sort_order", { ascending: true })
      .order("sold_at", { ascending: false });
    if (error) throw new Error(error.message);
    return withUrls((rows ?? []) as unknown as RawRow[]);
  });

export const adminSaveSoldProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      siteId: string;
      address: string;
      neighborhood?: string | null;
      note?: string | null;
      sold_at?: string | null;
      is_published?: boolean;
      sort_order?: number;
      storage_path?: string | null;
      image_url?: string | null;
    }) => {
      const address = String(input.address ?? "")
        .trim()
        .slice(0, 200);
      if (address.length < 2) throw new Error("נדרשת כתובת הנכס שנמכר");
      const str = (v: unknown, max: number) => {
        const s = typeof v === "string" ? v.trim() : "";
        return s ? s.slice(0, max) : null;
      };
      return {
        id: input.id ?? null,
        siteId: String(input.siteId),
        address,
        neighborhood: str(input.neighborhood, 80),
        note: str(input.note, 200),
        sold_at: str(input.sold_at, 10),
        is_published: input.is_published !== false,
        sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0,
        storage_path: str(input.storage_path, 300),
        image_url: str(input.image_url, 500),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);

    const fields = {
      site_id: data.siteId,
      address: data.address,
      neighborhood: data.neighborhood,
      note: data.note,
      sold_at: data.sold_at,
      is_published: data.is_published,
      sort_order: data.sort_order,
      ...(data.storage_path ? { storage_path: data.storage_path } : {}),
      ...(data.image_url ? { image_url: data.image_url } : {}),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("sold_properties")
        .update(fields)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("sold_properties")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const adminDeleteSoldProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);

    const { data: row, error: readError } = await context.supabase
      .from("sold_properties")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    // RLS מוודא שמוחקים רק רשומות של ה-site שבבעלות המשתמש
    const { error } = await context.supabase.from("sold_properties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const path = (row as { storage_path: string | null } | null)?.storage_path;
    if (path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
    }
    return { ok: true };
  });
