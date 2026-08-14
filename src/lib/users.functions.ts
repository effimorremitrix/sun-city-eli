import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
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

    const [{ data: profiles, error }, { data: roles }, { data: sp }, { data: notes }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("search_profiles").select("user_id"),
      supabaseAdmin.from("listing_notifications").select("user_id"),
    ]);
    if (error) throw new Error(error.message);

    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
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
