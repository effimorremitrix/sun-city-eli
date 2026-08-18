import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeLive, type LiveSite } from "@/lib/site-live";

const PUBLIC_SLUG = "sun-city";

/* ------------------------- קריאה ציבורית ------------------------- */

export const getPublicSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { slug?: string | null }) => ({
    slug: (input?.slug ?? PUBLIC_SLUG).trim(),
  }))
  .handler(async ({ data: params }): Promise<LiveSite> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return mergeLive(null);

    const { data, error } = await db.rpc("get_public_site", { p_slug: params.slug });
    if (error) {
      console.error("get_public_site failed", error.message);
      return mergeLive(null);
    }
    return mergeLive(data);
  });

/* ------------------- ניהול (אדמין או סוכן בעל אתר) ------------------- */

export const getAdminSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { siteId?: string | null }) => ({ siteId: input?.siteId ?? null }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: params, context }) => {
    const { getManagerAccess } = await import("@/lib/admin.server");
    const access = await getManagerAccess(context);

    if (!access.isAdmin && !access.isAgent) {
      return {
        isAdmin: false,
        isSuperAdmin: false,
        isAgent: false,
        sites: [],
        site: null,
        live: mergeLive(null),
      };
    }

    // בחירת ה-site הפעיל: המבוקש, אחרת הראשי (לאדמין) או הראשון של הסוכן
    const site =
      (params.siteId ? access.sites.filter((s) => s.id === params.siteId)[0] : null) ??
      access.sites.filter((s) => s.slug === PUBLIC_SLUG)[0] ??
      access.sites[0] ??
      null;

    type AdminContent = {
      business: unknown;
      texts: unknown;
      translations: unknown;
      testimonials: unknown;
      faq: unknown;
    };
    let content: AdminContent | null = null;
    if (site) {
      const { data } = await context.supabase
        .from("site_content")
        .select("business, texts, translations, testimonials, faq")
        .eq("site_id", site.id)
        .maybeSingle();
      content = (data ?? null) as AdminContent | null;
    }

    return {
      isAdmin: access.isAdmin,
      isSuperAdmin: access.isSuperAdmin,
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
      business?: Record<string, unknown>;
      texts?: Record<string, unknown>;
      translations?: Record<string, unknown>;
      testimonials?: unknown[] | null;
      faq?: unknown[] | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertManager, assertSiteAccess } = await import("@/lib/admin.server");

    let siteId = data.siteId ?? null;
    if (siteId) {
      await assertSiteAccess(context, siteId);
    } else {
      const access = await assertManager(context);
      const fallback =
        access.sites.filter((s) => s.slug === PUBLIC_SLUG)[0] ?? access.sites[0] ?? null;
      if (!fallback) throw new Error("לא נמצאה רשומת אתר במסד הנתונים");
      siteId = fallback.id;
    }

    // ממליצים ושאלות נפוצות עוברים ולידציה; undefined = לא לגעת בערך הקיים
    let testimonials: unknown;
    let faq: unknown;
    if (data.testimonials !== undefined) {
      const { testimonialSchema } = await import("@/lib/listing-schema");
      testimonials =
        data.testimonials === null
          ? null
          : data.testimonials.slice(0, 30).map((t) => testimonialSchema.parse(t));
    }
    if (data.faq !== undefined) {
      const { faqItemSchema } = await import("@/lib/listing-schema");
      faq = data.faq === null ? null : data.faq.slice(0, 30).map((f) => faqItemSchema.parse(f));
    }

    const { error } = await context.supabase.from("site_content").upsert(
      {
        site_id: siteId,
        ...(data.business !== undefined ? { business: data.business as never } : {}),
        ...(data.texts !== undefined ? { texts: data.texts as never } : {}),
        ...(data.translations ? { translations: data.translations as never } : {}),
        ...(data.testimonials !== undefined ? { testimonials: testimonials as never } : {}),
        ...(data.faq !== undefined ? { faq: faq as never } : {}),
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

    // המנהל הראשון הוא גם המנהל הראשי (super admin)
    const { error: superError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "super_admin" }, { onConflict: "user_id,role" });
    if (superError) throw new Error(superError.message);

    return { ok: true };
  });
