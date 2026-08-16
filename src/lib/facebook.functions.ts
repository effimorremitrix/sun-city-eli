import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PostCopy } from "@/lib/post-copy.server";
import type { CampaignParams, FacebookStatus } from "@/lib/facebook.server";

/** בדיקת הרשאה לנכס — הסוכן של ה-site או האדמין */
async function assertListingAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- אותו טיפוס Ctx כמו ב-admin.server
  context: { supabase: any; userId: string },
  listingId: string,
) {
  const { assertManager } = await import("@/lib/admin.server");
  await assertManager(context);
  const { data: canManage } = await context.supabase.rpc("owns_listing", {
    _listing_id: listingId,
  });
  if (!canManage) throw new Error("Forbidden");
}

/** מצב חיבור הפייסבוק של ה-site (ללא הטוקן) + קישור התחברות */
export const getFacebookStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => input)
  .handler(async ({ data, context }): Promise<FacebookStatus & { authUrl: string | null }> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { getConnectionStatus, facebookConfigured, facebookAuthUrl } =
      await import("@/lib/facebook.server");
    const status = await getConnectionStatus(data.siteId);
    return {
      ...status,
      authUrl: facebookConfigured() ? facebookAuthUrl(data.siteId, context.userId) : null,
    };
  });

export const disconnectFacebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_connections")
      .delete()
      .eq("site_id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** נוסחי פוסט מוכנים לנכס (נוצרים פעם אחת ונשמרים) */
export const getListingPostCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; force?: boolean }) => input)
  .handler(async ({ data, context }): Promise<PostCopy> => {
    await assertListingAccess(context, data.listingId);
    const { generatePostCopy } = await import("@/lib/post-copy.server");
    return generatePostCopy(data.listingId, data.force === true);
  });

/** פרסום אוטומטי אמיתי לעמוד הפייסבוק המחובר */
export const publishListingToFacebookPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; message: string }) => ({
    listingId: String(input.listingId),
    message: String(input.message ?? "")
      .trim()
      .slice(0, 4000),
  }))
  .handler(async ({ data, context }) => {
    if (!data.message) throw new Error("נדרש נוסח לפוסט");
    await assertListingAccess(context, data.listingId);
    const { publishListingToPage } = await import("@/lib/facebook.server");
    const origin = new URL(getRequest().url).origin;
    return publishListingToPage(
      data.listingId,
      data.message,
      context.userId,
      `${origin}/#properties`,
    );
  });

/** קמפיין ממומן — נוצר תמיד במצב PAUSED, ההפעלה ידנית ב-Ads Manager */
export const createFacebookCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; message: string; params: CampaignParams }) => {
    const p = input.params ?? ({} as CampaignParams);
    const clamp = (v: unknown, min: number, max: number, dflt: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
    };
    return {
      listingId: String(input.listingId),
      message: String(input.message ?? "")
        .trim()
        .slice(0, 4000),
      params: {
        dailyBudgetIls: clamp(p.dailyBudgetIls, 10, 1000, 50),
        durationDays: clamp(p.durationDays, 1, 60, 7),
        radiusKm: clamp(p.radiusKm, 1, 80, 15),
        ageMin: clamp(p.ageMin, 18, 65, 25),
        ageMax: clamp(p.ageMax, 18, 65, 65),
      },
    };
  })
  .handler(async ({ data, context }) => {
    if (!data.message) throw new Error("נדרש נוסח למודעה");
    await assertListingAccess(context, data.listingId);
    const { createPausedCampaign } = await import("@/lib/facebook.server");
    const origin = new URL(getRequest().url).origin;
    return createPausedCampaign(
      data.listingId,
      data.message,
      data.params,
      context.userId,
      `${origin}/#properties`,
    );
  });

/* ---------------------- קבוצות (תהליך ידני) ---------------------- */

export const listFacebookGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { data: rows, error } = await context.supabase
      .from("facebook_groups")
      .select("id, name, url, created_at")
      .eq("site_id", data.siteId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows as Array<{ id: string; name: string; url: string; created_at: string }>;
  });

export const addFacebookGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; name: string; url: string }) => {
    const url = String(input.url ?? "").trim();
    if (!/^https:\/\/(www\.)?facebook\.com\//.test(url)) {
      throw new Error("נדרש קישור לקבוצת פייסבוק (facebook.com)");
    }
    return {
      siteId: String(input.siteId),
      name: String(input.name ?? "")
        .trim()
        .slice(0, 120),
      url: url.slice(0, 500),
    };
  })
  .handler(async ({ data, context }) => {
    if (!data.name) throw new Error("נדרש שם לקבוצה");
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { error } = await context.supabase.from("facebook_groups").insert({
      site_id: data.siteId,
      name: data.name,
      url: data.url,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFacebookGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    // RLS מוודא שמוחקים רק קבוצות של ה-site שבבעלות המשתמש
    const { error } = await context.supabase.from("facebook_groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** יומן הפרסומים של נכס */
export const listListingPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertListingAccess(context, data.listingId);
    const { data: rows, error } = await context.supabase
      .from("listing_posts")
      .select("id, target, status, fb_post_id, fb_campaign_id, error, created_at")
      .eq("listing_id", data.listingId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return rows as Array<{
      id: string;
      target: string;
      status: string;
      fb_post_id: string | null;
      fb_campaign_id: string | null;
      error: string | null;
      created_at: string;
    }>;
  });
