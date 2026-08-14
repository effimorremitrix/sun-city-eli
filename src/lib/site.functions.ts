import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeLive, type LiveSite } from "@/lib/site-live";

const PUBLIC_SLUG = "sun-city";

/* ------------------------- קריאה ציבורית ------------------------- */

export const getPublicSite = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveSite> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return mergeLive(null);

    const { data, error } = await db.rpc("get_public_site", { p_slug: PUBLIC_SLUG });
    if (error) {
      console.error("get_public_site failed", error.message);
      return mergeLive(null);
    }
    return mergeLive(data);
  },
);

/* ------------------------- ניהול (ADMIN יחיד) ------------------------- */

type SiteRow = { id: string; slug: string; name: string };

export const getAdminSite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { isAdmin: false, site: null, live: mergeLive(null) };

    const { data: sites } = await supabase
      .from("sites")
      .select("id, slug, name")
      .eq("slug", PUBLIC_SLUG)
      .limit(1);
    const site = ((sites ?? [])[0] ?? null) as SiteRow | null;

    let content: { business: unknown; texts: unknown } | null = null;
    if (site) {
      const { data } = await supabase
        .from("site_content")
        .select("business, texts")
        .eq("site_id", site.id)
        .maybeSingle();
      content = (data ?? null) as { business: unknown; texts: unknown } | null;
    }

    return { isAdmin: true, site, live: mergeLive(content ? { ...content } : null) };
  });

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { business: Record<string, unknown>; texts: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const { data: sites } = await context.supabase
      .from("sites")
      .select("id")
      .eq("slug", PUBLIC_SLUG)
      .limit(1);
    const siteId = (sites ?? [])[0]?.id as string | undefined;
    if (!siteId) throw new Error("לא נמצאה רשומת אתר במסד הנתונים");

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
