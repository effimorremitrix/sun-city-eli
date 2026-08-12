import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeLive, type LiveSite } from "@/lib/site-live";

const PUBLIC_SLUG = "sun-city";

/* ------------------------- קריאה ציבורית ------------------------- */

export const getPublicSite = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveSite> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return mergeLive(null);

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data, error } = await client.rpc("get_public_site", { p_slug: PUBLIC_SLUG });
    if (error) {
      console.error("get_public_site failed", error.message);
      return mergeLive(null);
    }
    return mergeLive(data);
  },
);

/* ------------------------- אזור מנוהל ------------------------- */

type SiteRow = { id: string; slug: string; name: string; owner_id: string };
type ContentRow = { business: unknown; texts: unknown };
type ItemRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  price: number | null;
  price_note: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");

    const { data: sites } = await supabase
      .from("sites")
      .select("id, slug, name, owner_id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const site = ((sites ?? [])[0] ?? null) as SiteRow | null;

    let content: ContentRow | null = null;
    let items: ItemRow[] = [];
    if (site) {
      const [{ data: c }, { data: i }] = await Promise.all([
        supabase.from("site_content").select("business, texts").eq("site_id", site.id).maybeSingle(),
        supabase
          .from("site_items")
          .select("id, kind, title, description, price, price_note, image_url, sort_order, is_active")
          .eq("site_id", site.id)
          .order("sort_order", { ascending: true }),
      ]);
      content = (c ?? null) as ContentRow | null;
      items = (i ?? []) as ItemRow[];
    }

    return {
      isAdmin,
      site,
      live: mergeLive(content ? { ...content } : null),
      items,
    };
  });

async function ownedSiteId(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("sites")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  const id = (data ?? [])[0]?.id as string | undefined;
  if (!id) throw new Error("לא נמצא אתר המשויך לחשבון שלך");
  return id;
}

export const saveMyContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { business: Record<string, unknown>; texts: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    const siteId = await ownedSiteId(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("site_content").upsert(
      {
        site_id: siteId,
        business: data.business,
        texts: data.texts,
      },
      { onConflict: "site_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMyItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      kind: string;
      title: string;
      description?: string | null;
      price?: number | null;
      price_note?: string | null;
      image_url?: string | null;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      if (!input.title?.trim()) throw new Error("נדרשת כותרת");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const siteId = await ownedSiteId(context.supabase as never, context.userId);
    const row = {
      site_id: siteId,
      kind: data.kind || "product",
      title: data.title.trim(),
      description: data.description ?? null,
      price: data.price ?? null,
      price_note: data.price_note ?? null,
      image_url: data.image_url ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    };

    if (data.id) {
      // RLS מגביל את העדכון לאתר שבבעלות המשתמש בלבד
      const { error } = await context.supabase
        .from("site_items")
        .update(row)
        .eq("id", data.id)
        .eq("site_id", siteId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await context.supabase.from("site_items").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const siteId = await ownedSiteId(context.supabase as never, context.userId);
    const { error } = await context.supabase
      .from("site_items")
      .delete()
      .eq("id", data.id)
      .eq("site_id", siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- סמכויות מפתח ------------------------- */

export const claimDeveloperRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("קיים כבר חשבון מפתח במערכת");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listAllSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sites")
      .select("id, slug, name, owner_id, created_at, profiles:owner_id(email)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      slug: string;
      name: string;
      owner_id: string;
      created_at: string;
      profiles: { email: string | null } | null;
    }>;
  });

export const createClientSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; siteName: string; slug: string }) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error("אימייל לא תקין");
    if (input.password.length < 8) throw new Error("סיסמה באורך 8 תווים לפחות");
    if (!/^[a-z0-9-]{2,40}$/.test(input.slug)) throw new Error("מזהה אתר באותיות אנגליות קטנות ומקפים");
    if (!input.siteName.trim()) throw new Error("נדרש שם אתר");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (userError || !created.user) throw new Error(userError?.message ?? "יצירת המשתמש נכשלה");

    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "client" });

    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .insert({ slug: data.slug, name: data.siteName.trim(), owner_id: created.user.id })
      .select("id")
      .single();
    if (siteError) throw new Error(siteError.message);

    await supabaseAdmin.from("site_content").insert({ site_id: site.id });
    return { ok: true, siteId: site.id as string };
  });
