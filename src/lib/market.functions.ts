import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MARKET_COLUMNS, type MarketListing } from "@/lib/market";

/** מודעות פעילות מהשוק — לדף הבית ולאזור האישי (ציבורי, RLS מסנן מוסתרות) */
export const listPublicMarketListings = createServerFn({ method: "GET" })
  .inputValidator((input?: { limit?: number }) => ({
    limit: Math.min(300, Math.max(1, Number(input?.limit ?? 200) || 200)),
  }))
  .handler(async ({ data }): Promise<MarketListing[]> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return [];
    const { data: rows, error } = await db
      .from("market_listings")
      .select(MARKET_COLUMNS)
      .eq("is_active", true)
      .eq("hidden_by_admin", false)
      .order("first_seen_at", { ascending: false })
      .limit(data.limit);
    if (error) {
      console.error("listPublicMarketListings failed", error.message);
      return [];
    }
    return (rows ?? []) as unknown as MarketListing[];
  });

/** מודעה אחת מהשוק (לקישור עמוק ?market=<id>) */
export const getPublicMarketListing = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }): Promise<MarketListing | null> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db || !data.id) return null;
    const { data: row } = await db
      .from("market_listings")
      .select(MARKET_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    return (row as unknown as MarketListing | null) ?? null;
  });

/** ניהול: רשימת מודעות השוק (כולל מוסתרות) — מנהל ראשי */
export const adminListMarketListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { q?: string | null; onlyActive?: boolean }) => ({
    q: String(input?.q ?? "")
      .trim()
      .slice(0, 80),
    onlyActive: input?.onlyActive !== false,
  }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("market_listings")
      .select(`${MARKET_COLUMNS}, is_active, hidden_by_admin`)
      .order("first_seen_at", { ascending: false })
      .limit(300);
    if (data.onlyActive) q = q.eq("is_active", true);
    if (data.q) q = q.ilike("title", `%${data.q.replace(/[%_]/g, "")}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const { data: tasks } = await supabaseAdmin
      .from("market_scan_tasks")
      .select("key, deal_type, neighborhood, demand, last_scanned_at, last_found, last_error")
      .order("demand", { ascending: false });
    return {
      listings: (rows ?? []) as unknown as MarketListing[],
      tasks: (tasks ?? []) as Array<{
        key: string;
        deal_type: string;
        neighborhood: string;
        demand: number;
        last_scanned_at: string | null;
        last_found: number | null;
        last_error: string | null;
      }>,
    };
  });

export const adminSetMarketListingHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; hidden: boolean }) => ({
    id: String(input?.id ?? ""),
    hidden: input?.hidden === true,
  }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("market_listings")
      .update({ hidden_by_admin: data.hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
