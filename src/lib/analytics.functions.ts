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

/* ------------------------- משפך ומקורות (v2) ------------------------- */

export type AnalyticsFunnel = {
  funnel: {
    visits: number;
    propertyViews: number;
    contacts: number;
    signups: number;
    leads: number;
    interests: number;
    callbacks: number;
    deals: number;
  };
  perSite: Array<{
    siteId: string;
    name: string;
    slug: string;
    visits: number;
    propertyViews: number;
    whatsappClicks: number;
    phoneClicks: number;
    aiSearches: number;
    signups: number;
    leads: number;
    interests: number;
    callbacks: number;
    deals: number;
    openLeads: number;
  }>;
  leadSources: Array<{ source: string; leads: number; interests: number; deals: number }>;
  leadChannels: Array<{ source: string; leads: number }>;
  campaigns: Array<{ campaign: string; leads: number; deals: number }>;
  firstTouchSites: Array<{ siteId: string; name: string; contacts: number }>;
  topListings: Array<{ listingId: string; title: string; views: number; leads: number }>;
};

/** משפך ההמרות ומקורות הלידים (analytics_funnel, SECURITY DEFINER; סוכן — הדפים שלו) */
export const getAnalyticsFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => {
    const from = new Date(String(input?.from ?? ""));
    const to = new Date(String(input?.to ?? ""));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      throw new Error("טווח תאריכים לא תקין");
    return { from: from.toISOString(), to: to.toISOString() };
  })
  .handler(async ({ data, context }): Promise<AnalyticsFunnel> => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { data: result, error } = await context.supabase.rpc("analytics_funnel", {
      p_from: data.from,
      p_to: data.to,
    });
    if (error) throw new Error(error.message);
    return result as unknown as AnalyticsFunnel;
  });
