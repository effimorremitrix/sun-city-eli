import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchProfileSchema } from "@/lib/listing-schema";
import { LISTING_COLUMNS, type Listing } from "@/lib/listings";

export type SearchProfileRow = {
  id: string;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  rooms: number | null;
  max_rooms: number | null;
  street: string | null;
  min_size: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  notes: string | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
  whatsapp_phone: string | null;
  is_active: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  reason: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  /* תגובת הלקוח על ההתראה — 'interested' / 'wants_tour' / 'talk_to_me' */
  response: string | null;
  response_at: string | null;
  created_at: string;
  listing: Listing | null;
};

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [
      { data: isAdmin },
      { data: isSuperAdmin },
      { data: isAgent },
      { data: profile },
      { data: profiles },
      { data: notifications },
    ] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "agent" }),
      supabase.from("profiles").select("full_name").eq("id", userId).single(),
      supabase
        .from("search_profiles")
        .select(
          "id, label, deal_type, city, neighborhoods, min_price, max_price, min_rooms, rooms, max_rooms, street, min_size, needs_mamad, needs_elevator, needs_parking, needs_balcony, notes, notify_email, notify_whatsapp, whatsapp_phone, is_active, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("listing_notifications")
        .select(
          `id, reason, read_at, email_sent_at, response, response_at, created_at, listing:listing_id(${LISTING_COLUMNS})`,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      isAdmin: Boolean(isAdmin),
      isSuperAdmin: Boolean(isSuperAdmin),
      isAgent: Boolean(isAgent),
      fullName: profile?.full_name ?? null,
      profiles: (profiles ?? []) as unknown as SearchProfileRow[],
      notifications: (notifications ?? []) as unknown as NotificationRow[],
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = input as { full_name?: string };
    return { full_name: String(parsed.full_name ?? "").trim() };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMySearchProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase
        .from("search_profiles")
        .update(fields)
        .eq("id", id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await context.supabase
      .from("search_profiles")
      .insert({ ...fields, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const deleteMySearchProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("search_profiles")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("listing_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
