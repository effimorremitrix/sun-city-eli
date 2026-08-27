import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * סיכום המדידה העצמית לדשבורד הסטטיסטיקות. האגרגציה כולה רצה במסד
 * (analytics_overview, SECURITY DEFINER): אדמין מקבל את כל האתרים
 * והשוואת סוכנים; סוכן — רק את האתרים שבבעלותו.
 */

export type AnalyticsSummary = {
  totals: { views: number; sessions: number; newSessions: number };
  perDay: Array<{ day: string; views: number }>;
  sources: Array<{ source: string; views: number }>;
  perSite: Array<{
    siteId: string;
    name: string;
    slug: string;
    views: number;
    sessions: number;
    propertyViews: number;
    whatsappClicks: number;
    phoneClicks: number;
    leadSubmits: number;
    leads: number;
    signups: number;
  }>;
  topListings: Array<{ listingId: string; title: string; views: number }>;
};

export const getAnalyticsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => {
    const from = new Date(String(input?.from ?? ""));
    const to = new Date(String(input?.to ?? ""));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      throw new Error("טווח תאריכים לא תקין");
    return { from: from.toISOString(), to: to.toISOString() };
  })
  .handler(async ({ data, context }): Promise<AnalyticsSummary> => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { data: result, error } = await context.supabase.rpc("analytics_overview", {
      p_from: data.from,
      p_to: data.to,
    });
    if (error) throw new Error(error.message);
    return result as unknown as AnalyticsSummary;
  });
