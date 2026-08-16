import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeLive, type LiveSite } from "@/lib/site-live";

/** ה-slug של האתר הראשי — הדף האישי של אלי כליף (הבעלים) */
const PUBLIC_SLUG = "sun-city";

/* ------------------------- קריאה ציבורית ------------------------- */

export const getPublicSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { slug?: string | null }) => ({
    slug: (input?.slug ?? PUBLIC_SLUG).trim(),
  }))
  .handler(async ({ data }): Promise<LiveSite> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return mergeLive(null);

    const { data: site, error } = await db.rpc("get_public_site", { p_slug: data.slug });
    if (error) {
      console.error("get_public_site failed", error.message);
      return mergeLive(null);
    }
    return mergeLive(site);
  });

/* ------------------- ניהול (אדמין או סוכן בעל אתר) ------------------- */

export const getAdminSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { siteId?: string | null }) => ({ siteId: input?.siteId ?? null }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { getManagerAccess } = await import("@/lib/admin.server");
    const access = await getManagerAccess(context);

    if (!access.isAdmin && !access.isAgent) {
      return {
        isAdmin: false,
        isAgent: false,
        sites: [],
        site: null,
        live: mergeLive(null),
      };
    }

    // בחירת ה-site הפעיל: המבוקש, אחרת הראשי (לאדמין) או הראשון של הסוכן
    const site =
      (data.siteId ? access.sites.filter((s) => s.id === data.siteId)[0] : null) ??
      access.sites.filter((s) => s.slug === PUBLIC_SLUG)[0] ??
      access.sites[0] ??
      null;

    let content: { business: unknown; texts: unknown } | null = null;
    if (site) {
      const { data: row } = await context.supabase
        .from("site_content")
        .select("business, texts")
        .eq("site_id", site.id)
        .maybeSingle();
      content = (row ?? null) as { business: unknown; texts: unknown } | null;
    }

    return {
      isAdmin: access.isAdmin,
      isAgent: access.isAgent,
      sites: access.sites,
      site,
      live: mergeLive(content ? { ...content, id: site?.id, slug: site?.slug } : null),
    };
  });

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      siteId?: string | null;
      business: Record<string, unknown>;
      texts: Record<string, unknown>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertManager, assertSiteAccess } = await import("@/lib/admin.server");

    let siteId = data.siteId ?? null;
    if (siteId) {
      await assertSiteAccess(context, siteId);
    } else {
      const access = await assertManager(context);
      const site =
        access.sites.filter((s) => s.slug === PUBLIC_SLUG)[0] ?? access.sites[0] ?? null;
      if (!site) throw new Error("לא נמצאה רשומת אתר במסד הנתונים");
      siteId = site.id;
    }

    const { error } = await context.supabase.from("site_content").upsert(
      {
        site_id: siteId,
        business: data.business as never,
        texts: data.texts as never,
      },
      { onConflict: "site_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- הקמת ה־ADMIN הראשון ------------------------- */

export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("קיים כבר מנהל במערכת");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
