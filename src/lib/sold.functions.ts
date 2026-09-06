import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OFFICE_SLUG } from "@/lib/site-data";

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
/**
 * גודל עמוד ברירת-המחדל של מדור "נמכר על ידינו" — בלם ביצועים בלבד (חתימת
 * כתובת לכל תמונה): שאר הנכסים נטענים בעימוד דרך "הצג עוד", כך שאין תקרה
 * בפועל על מספר הנמכרים המוצגים.
 */
const PUBLIC_PAGE_SIZE = 60;

/** עמוד אחד ממדור הנמכרים + סך כל הרשומות המפורסמות (לכפתור "הצג עוד") */
export type SoldPage = { items: SoldProperty[]; total: number };

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
  .inputValidator((input: { offset?: number } | undefined) => {
    const offset = Number(input?.offset ?? 0);
    return { offset: Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0 };
  })
  .handler(async ({ data }): Promise<SoldPage> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return { items: [], total: 0 };

    const {
      data: rows,
      count,
      error,
    } = await db
      .from("sold_properties")
      .select(COLUMNS, { count: "exact" })
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("sold_at", { ascending: false })
      .range(data.offset, data.offset + PUBLIC_PAGE_SIZE - 1);
    if (error) {
      console.error("listPublicSoldProperties failed", error.message);
      return { items: [], total: 0 };
    }
    return {
      items: await withUrls((rows ?? []) as unknown as RawRow[]),
      total: count ?? rows?.length ?? 0,
    };
  });

/* ------------------ ניהול (אדמין או סוכן, לפי ה-site) ------------------ */

/**
 * רשימת הנמכרים בלוח הניהול: הנכסים של האתר הנבחר + כל היסטוריית המכירות
 * המפורסמת של המשרד (לקריאה — `editable` מסמן מה שייך לאתר הנבחר וניתן
 * לעריכה). כך גם נמכרים שהמשרד הזין מופיעים אצל כל סוכן.
 */
export const adminListSoldProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => input)
  .handler(async ({ data, context }): Promise<Array<SoldProperty & { editable: boolean }>> => {
    const { assertManager, assertSiteAccess } = await import("@/lib/admin.server");
    const access = await assertManager(context);
    await assertSiteAccess(context, data.siteId);
    let query = context.supabase.from("sold_properties").select(COLUMNS);
    // סוכן רואה גם את היסטוריית המכירות המשותפת (לקריאה); אדמין שבחר אתר
    // בבורר מקבל את האתר הזה בלבד — הבורר נשאר סינון אמיתי
    query = access.isAdmin
      ? query.eq("site_id", data.siteId)
      : query.or(`site_id.eq.${data.siteId},is_published.eq.true`);
    const { data: rows, error } = await query
      .order("sort_order", { ascending: true })
      .order("sold_at", { ascending: false });
    if (error) throw new Error(error.message);
    const items = await withUrls((rows ?? []) as unknown as RawRow[]);
    return items.map((item) => ({ ...item, editable: item.site_id === data.siteId }));
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
      /** שיוך לדף/סוכן אחר מהנבחר בבורר (מנהל ראשי) */
      targetSiteId?: string | null;
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
        targetSiteId: str(input.targetSiteId, 60),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    let siteId = data.siteId;
    if (data.targetSiteId && data.targetSiteId !== data.siteId) {
      await assertSiteAccess(context, data.targetSiteId);
      siteId = data.targetSiteId;
    }

    const fields = {
      site_id: siteId,
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

/** תוצאת סימון נכס כנמכר — כולל פוסט מוכן להעתקה וסטטוס הפרסום לאינסטגרם */
export type MarkListingSoldResult = {
  ok: true;
  soldId: string;
  post: { text: string; imageUrl: string | null };
  instagram: { attempted: boolean; posted: boolean; error: string | null };
};

/**
 * סימון נכס קיים כ"נמכר" בפעולה אחת: יצירת רשומה במדור "נמכר על ידינו"
 * (כולל העתקת התמונה הראשית), הסתרת הנכס מהאתר, והכנת פוסט "נמכר" —
 * כולל ניסיון פרסום אוטומטי לאינסטגרם כשמחובר חשבון עסקי (כשל שם אינו
 * מבטל את הסימון).
 */
export const adminMarkListingSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; autoPostInstagram?: boolean }) => ({
    listingId: String(input.listingId),
    // פרסום לאינסטגרם רק באישור מפורש — ברירת המחדל היא לא לפרסם שום דבר
    autoPostInstagram: input.autoPostInstagram === true,
  }))
  .handler(async ({ data, context }): Promise<MarkListingSoldResult> => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);

    const { data: listing, error: listingError } = await context.supabase
      .from("listings")
      .select("id, site_id, title, address, neighborhood, image_url")
      .eq("id", data.listingId)
      .maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing) throw new Error("הנכס לא נמצא");

    // נכסים ישנים בלי site_id שייכים לאתר הראשי (אותה מוסכמה כמו ברשימת הניהול)
    const siteId =
      (listing.site_id as string | null) ??
      access.sites.filter((s) => s.slug === OFFICE_SLUG)[0]?.id;
    if (!siteId || !access.sites.some((s) => s.id === siteId)) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // התמונה הראשית: קובץ באחסון מועתק למדור (כדי שמחיקת הנכס לא תשבור אותו)
    const { data: images } = await context.supabase
      .from("listing_images")
      .select("storage_path, external_url, kind, sort_order")
      .eq("listing_id", data.listingId)
      .order("sort_order", { ascending: true });
    const firstImage = (
      (images ?? []) as Array<{
        storage_path: string | null;
        external_url: string | null;
        kind: string | null;
      }>
    ).filter((i) => i.kind !== "video")[0];

    let soldStoragePath: string | null = null;
    let soldImageUrl: string | null = null;
    if (firstImage?.storage_path) {
      const ext = firstImage.storage_path.split(".").pop()?.toLowerCase() || "jpg";
      const dest = `sold/${siteId}/${crypto.randomUUID()}.${ext}`;
      const { error: copyError } = await supabaseAdmin.storage
        .from(BUCKET)
        .copy(firstImage.storage_path, dest);
      if (copyError) {
        console.error("mark-sold image copy failed", copyError.message);
      } else {
        soldStoragePath = dest;
      }
    }
    if (!soldStoragePath) {
      soldImageUrl = firstImage?.external_url ?? (listing.image_url as string | null) ?? null;
      if (soldImageUrl && !soldImageUrl.startsWith("http")) soldImageUrl = null;
    }

    const address =
      String(listing.address ?? "").trim() || String(listing.title ?? "").trim() || "נכס";

    const { data: soldRow, error: insertError } = await context.supabase
      .from("sold_properties")
      .insert({
        site_id: siteId,
        address: address.slice(0, 200),
        neighborhood: (listing.neighborhood as string | null) ?? null,
        note: null,
        sold_at: new Date().toISOString().slice(0, 10),
        is_published: true,
        sort_order: 0,
        ...(soldStoragePath ? { storage_path: soldStoragePath } : {}),
        ...(soldImageUrl ? { image_url: soldImageUrl } : {}),
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    const { error: unpublishError } = await context.supabase
      .from("listings")
      .update({ is_published: false })
      .eq("id", data.listingId);
    if (unpublishError) throw new Error(unpublishError.message);

    // פוסט "נמכר" מוכן להעתקה + כתובת תמונה טרייה לפרסום
    const { buildSoldPostCopy } = await import("@/lib/post-copy.server");
    const post = buildSoldPostCopy({
      title: String(listing.title ?? ""),
      address: listing.address as string | null,
      neighborhood: listing.neighborhood as string | null,
    });

    let postImageUrl: string | null = soldImageUrl;
    if (soldStoragePath) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(soldStoragePath, SIGNED_TTL);
      postImageUrl = signed?.signedUrl ?? null;
    }

    // פרסום אוטומטי לאינסטגרם — רק כשסומן במפורש בפעולת הסימון; מיטב-מאמץ,
    // לעולם לא מפיל את הסימון
    const instagram = { attempted: false, posted: false, error: null as string | null };
    try {
      const { data: conn } = data.autoPostInstagram
        ? await supabaseAdmin
            .from("facebook_connections")
            .select("ig_user_id")
            .eq("site_id", siteId)
            .maybeSingle()
        : { data: null };
      if (conn?.ig_user_id && postImageUrl) {
        instagram.attempted = true;
        const { publishSoldToInstagram } = await import("@/lib/facebook.server");
        await publishSoldToInstagram({
          listingId: data.listingId,
          imageUrl: postImageUrl,
          caption: post.text,
          siteId,
          userId: context.userId,
        });
        instagram.posted = true;
      }
    } catch (e) {
      instagram.error = e instanceof Error ? e.message : "הפרסום לאינסטגרם נכשל";
      console.error("instagram sold auto-post failed", instagram.error);
    }

    return {
      ok: true,
      soldId: soldRow.id as string,
      post: { text: post.text, imageUrl: postImageUrl },
      instagram,
    };
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
