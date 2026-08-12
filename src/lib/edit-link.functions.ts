import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeLive } from "@/lib/site-live";

/* ============ צד הבעלים/מפתח: הנפקה, הצגה וביטול של קישורי עריכה ============ */

export const listEditLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => input)
  .handler(async ({ data, context }) => {
    // RLS: רק מפתח או בעל האתר רואים את קישורי העריכה של האתר
    const { data: rows, error } = await context.supabase
      .from("site_edit_links")
      .select("id, label, role, revoked_at, last_used_at, created_at")
      .eq("site_id", data.siteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createEditLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; label?: string }) => input)
  .handler(async ({ data, context }) => {
    const { generateToken, hashToken } = await import("@/lib/edit-session.server");
    const token = generateToken();
    const token_hash = await hashToken(token);

    // RLS: ההוספה תיכשל אם המשתמש אינו בעל האתר או מפתח
    const { error } = await context.supabase.from("site_edit_links").insert({
      site_id: data.siteId,
      token_hash,
      role: "owner",
      label: data.label?.trim() || null,
    } as never);
    if (error) throw new Error(error.message);

    return { token };
  });

export const revokeEditLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("site_edit_links")
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ צד הלקוח: מימוש הקישור וסשן עריכה בלי חשבון ============ */

export const redeemEditLink = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => {
    if (!/^[a-f0-9]{32,128}$/.test(input.token ?? "")) throw new Error("קישור עריכה לא תקין");
    return input;
  })
  .handler(async ({ data }) => {
    const { editSession, hashToken } = await import("@/lib/edit-session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const token_hash = await hashToken(data.token);
    const { data: link } = await supabaseAdmin
      .from("site_edit_links")
      .select("id, site_id, role, revoked_at, sites:site_id(name, slug)")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (!link || link.revoked_at) throw new Error("קישור העריכה אינו תקף יותר");

    const site = link.sites as unknown as { name: string; slug: string } | null;

    await supabaseAdmin
      .from("site_edit_links")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", link.id);

    const session = await editSession();
    await session.update({
      siteId: link.site_id,
      role: link.role,
      siteName: site?.name ?? "",
      siteSlug: site?.slug ?? "",
    });

    return { ok: true as const, siteName: site?.name ?? "" };
  });

export const endEditSession = createServerFn({ method: "POST" }).handler(async () => {
  const { editSession } = await import("@/lib/edit-session.server");
  const session = await editSession();
  await session.clear();
  return { ok: true as const };
});

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

export const getEditWorkspace = createServerFn({ method: "GET" }).handler(async () => {
  const { requireEditSite } = await import("@/lib/edit-session.server");
  const { siteId, siteName, siteSlug } = await requireEditSite();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: content }, { data: items }] = await Promise.all([
    supabaseAdmin.from("site_content").select("business, texts").eq("site_id", siteId).maybeSingle(),
    supabaseAdmin
      .from("site_items")
      .select("id, kind, title, description, price, price_note, image_url, sort_order, is_active")
      .eq("site_id", siteId)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    site: { id: siteId, name: siteName, slug: siteSlug },
    live: mergeLive(content ? { ...content } : null),
    items: (items ?? []) as ItemRow[],
  };
});

export const saveEditContent = createServerFn({ method: "POST" })
  .inputValidator((input: { business: Record<string, unknown>; texts: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const { requireEditSite } = await import("@/lib/edit-session.server");
    const { siteId } = await requireEditSite();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_content").upsert(
      { site_id: siteId, business: data.business as never, texts: data.texts as never },
      { onConflict: "site_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveEditItem = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { requireEditSite } = await import("@/lib/edit-session.server");
    const { siteId } = await requireEditSite();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      site_id: siteId,
      kind: data.kind || "property",
      title: data.title.trim(),
      description: data.description ?? null,
      price: data.price ?? null,
      price_note: data.price_note ?? null,
      image_url: data.image_url ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("site_items")
        .update(row)
        .eq("id", data.id)
        .eq("site_id", siteId);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }

    const { error } = await supabaseAdmin.from("site_items").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteEditItem = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { requireEditSite } = await import("@/lib/edit-session.server");
    const { siteId } = await requireEditSite();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("site_items")
      .delete()
      .eq("id", data.id)
      .eq("site_id", siteId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
