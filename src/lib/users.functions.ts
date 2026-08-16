import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
  is_agent: boolean;
  agent_slug: string | null;
  profiles_count: number;
  notifications_count: number;
};

export type AdminUserSearchProfile = {
  id: string;
  label: string;
  deal_type: string;
  city: string | null;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  min_size: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  notes: string | null;
  notify_email: boolean;
  is_active: boolean;
  created_at: string;
};

/** רשימת כל הנרשמים עם ספירות פרופילי חיפוש והתראות */
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error }, { data: roles }, { data: sp }, { data: notes }, { data: sites }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("search_profiles").select("user_id"),
      supabaseAdmin.from("listing_notifications").select("user_id"),
      supabaseAdmin.from("sites").select("owner_id, slug"),
    ]);
    if (error) throw new Error(error.message);

    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const agentIds = new Set((roles ?? []).filter((r) => r.role === "agent").map((r) => r.user_id));
    const siteByOwner = new Map((sites ?? []).map((s) => [s.owner_id as string, s.slug as string]));
    const countBy = (rows: Array<{ user_id: string }> | null) => {
      const map = new Map<string, number>();
      for (const r of rows ?? []) map.set(r.user_id, (map.get(r.user_id) ?? 0) + 1);
      return map;
    };
    const spCount = countBy(sp as Array<{ user_id: string }> | null);
    const noteCount = countBy(notes as Array<{ user_id: string }> | null);

    const users: AdminUserRow[] = (profiles ?? []).map((p) => ({
      id: p.id as string,
      email: (p.email as string | null) ?? null,
      full_name: (p.full_name as string | null) ?? null,
      created_at: p.created_at as string,
      is_admin: adminIds.has(p.id as string),
      is_agent: agentIds.has(p.id as string) || siteByOwner.has(p.id as string),
      agent_slug: siteByOwner.get(p.id as string) ?? null,
      profiles_count: spCount.get(p.id as string) ?? 0,
      notifications_count: noteCount.get(p.id as string) ?? 0,
    }));

    return { users, currentUserId: context.userId, adminCount: adminIds.size };
  });

/** פרופילי החיפוש של משתמש נבחר */
export const adminGetUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const { data: rows, error } = await context.supabase
      .from("search_profiles")
      .select(
        "id, label, deal_type, city, neighborhoods, min_price, max_price, min_rooms, min_size, needs_mamad, needs_elevator, needs_parking, needs_balcony, notes, notify_email, is_active, created_at",
      )
      .eq("user_id", data.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return { profiles: (rows ?? []) as unknown as AdminUserSearchProfile[] };
  });

/** הוספה או הסרה של הרשאת מנהל */
export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => ({
    userId: String(input.userId),
    makeAdmin: Boolean(input.makeAdmin),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    if (data.userId === context.userId) {
      throw new Error("אי אפשר לשנות את הרשאת הניהול של עצמך");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) throw new Error("לא ניתן להסיר את המנהל האחרון במערכת");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  "auth",
  "admin",
  "account",
  "privacy",
  "accessibility",
  "reset-password",
  "api",
  "en",
  "fr",
  "ru",
]);

/**
 * הפיכת משתמש לסוכן: תפקיד agent + אתר אישי (sites) + תוכן ראשוני.
 * הדף האישי יעלה בכתובת /<slug> באותו עיצוב של האתר הראשי.
 */
export const adminCreateAgentSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; slug: string; agentName: string; roleTitle?: string; phone?: string; email?: string }) => ({
      userId: String(input.userId),
      slug: String(input.slug ?? "").trim().toLowerCase(),
      agentName: String(input.agentName ?? "").trim(),
      roleTitle: String(input.roleTitle ?? "").trim(),
      phone: String(input.phone ?? "").trim(),
      email: String(input.email ?? "").trim(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    if (!SLUG_RE.test(data.slug)) {
      throw new Error("כתובת הדף (slug) חייבת להיות באותיות לטיניות קטנות, ספרות ומקפים");
    }
    if (RESERVED_SLUGS.has(data.slug)) throw new Error("הכתובת הזו שמורה למערכת");
    if (data.agentName.length < 2) throw new Error("נדרש שם סוכן");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing) throw new Error("כבר קיים דף עם הכתובת הזו");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "agent" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .insert({ slug: data.slug, name: data.agentName, owner_id: data.userId })
      .select("id")
      .single();
    if (siteError) throw new Error(siteError.message);

    // תוכן ראשוני כדי שהדף לא יציג את הפרטים של הסוכן הראשי
    const phoneTel = data.phone.replace(/\D/g, "");
    const { error: contentError } = await supabaseAdmin.from("site_content").upsert(
      {
        site_id: site.id as string,
        business: {
          agentName: data.agentName,
          roleTitle: data.roleTitle || 'יועץ/ת נדל"ן',
          ...(data.phone ? { phone: data.phone, phoneTel } : {}),
          ...(data.email ? { email: data.email } : {}),
          photoUrl: "",
          bio: "",
        } as never,
        texts: {
          heroTitle: `${data.agentName} — נדל"ן בנתניה`,
        } as never,
      },
      { onConflict: "site_id" },
    );
    if (contentError) throw new Error(contentError.message);

    return { ok: true, siteId: site.id as string, slug: data.slug };
  });

/** מחיקה מלאה של חשבון משתמש וכל הנתונים שלו */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; confirmEmail: string }) => ({
    userId: String(input.userId),
    confirmEmail: String(input.confirmEmail ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    if (data.userId === context.userId) throw new Error("אי אפשר למחוק את החשבון של עצמך");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    const email = ((profile?.email as string | null) ?? "").trim().toLowerCase();
    if (!email || email !== data.confirmEmail) {
      throw new Error("המייל שהוקלד אינו תואם למשתמש שנבחר");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    return { ok: true };
  });
