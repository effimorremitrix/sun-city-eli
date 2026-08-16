import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * אינטגרציית פייסבוק לכל אתר סוכן:
 * - פרסום אוטומטי לעמוד העסקי (Graph API, הרשאת pages_manage_posts)
 * - קמפיין ממומן דרך Marketing API — נוצר תמיד במצב PAUSED
 * קבוצות ומרקטפלייס נשארים תהליך ידני: Meta סגרה את ה-API לקבוצות (אפריל
 * 2024) ולמרקטפלייס אין API ציבורי — לכן שם מציגים "פוסט מוכן להעתקה".
 *
 * page_access_token נשמר ב-facebook_connections ונקרא אך ורק בשרת.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

export function facebookConfigured(): boolean {
  return Boolean(env("META_APP_ID") && env("META_APP_SECRET") && env("META_REDIRECT_URI"));
}

/* ---------------------- state חתום ל-OAuth ---------------------- */

function sign(payload: string): string {
  const secret = env("META_APP_SECRET") ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function buildOAuthState(siteId: string, userId: string): string {
  const payload = `${siteId}:${userId}:${Date.now()}`;
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(payload)}`;
}

export function parseOAuthState(state: string): { siteId: string; userId: string } | null {
  const [encoded, mac] = state.split(".");
  if (!encoded || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return null;
  }
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [siteId, userId, ts] = payload.split(":");
  if (!siteId || !userId || !ts) return null;
  // ה-state תקף לשעה
  if (Date.now() - Number(ts) > 60 * 60 * 1000) return null;
  return { siteId, userId };
}

export function facebookAuthUrl(siteId: string, userId: string): string {
  const appId = env("META_APP_ID");
  const redirect = env("META_REDIRECT_URI");
  if (!appId || !redirect) throw new Error("חיבור פייסבוק אינו מוגדר (חסרים משתני META_*)");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirect,
    state: buildOAuthState(siteId, userId),
    scope: "pages_manage_posts,pages_read_engagement,ads_management,business_management",
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

/* ---------------------- קריאות Graph ---------------------- */

async function graph<T>(path: string, params: Record<string, string>, method = "GET"): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  let body: string | null = null;
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    body = new URLSearchParams(params).toString();
  }
  const res = await fetch(url, {
    method,
    headers: method === "GET" ? {} : { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string; code?: number };
  };
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Facebook API: ${msg}`);
  }
  return json;
}

/** החלפת code בטוקן עמוד ארוך-טווח ושמירת החיבור */
export async function handleFacebookCallback(code: string, state: string): Promise<{ siteId: string; pageName: string }> {
  const parsed = parseOAuthState(state);
  if (!parsed) throw new Error("state לא תקין");
  const appId = env("META_APP_ID")!;
  const appSecret = env("META_APP_SECRET")!;
  const redirect = env("META_REDIRECT_URI")!;

  const tokenRes = await graph<{ access_token: string }>("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirect,
    code,
  });

  const longLived = await graph<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: tokenRes.access_token,
  });

  const pages = await graph<{ data: Array<{ id: string; name: string; access_token: string }> }>(
    "/me/accounts",
    { access_token: longLived.access_token },
  );
  const page = pages.data?.[0];
  if (!page) throw new Error("לא נמצא עמוד עסקי בחשבון הפייסבוק שחובר");

  // חשבון מודעות (אופציונלי — נדרש רק לקמפיינים)
  let adAccountId: string | null = null;
  try {
    const ads = await graph<{ data: Array<{ id: string }> }>("/me/adaccounts", {
      access_token: longLived.access_token,
    });
    adAccountId = ads.data?.[0]?.id ?? null;
  } catch {
    adAccountId = null;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("facebook_connections").upsert(
    {
      site_id: parsed.siteId,
      page_id: page.id,
      page_name: page.name,
      page_access_token: page.access_token,
      ad_account_id: adAccountId,
      connected_by: parsed.userId,
    },
    { onConflict: "site_id" },
  );
  if (error) throw new Error(error.message);

  return { siteId: parsed.siteId, pageName: page.name };
}

/* ---------------------- מצב חיבור (בלי טוקן!) ---------------------- */

export type FacebookStatus = {
  configured: boolean;
  connected: boolean;
  pageName: string | null;
  hasAdAccount: boolean;
  connectedAt: string | null;
};

export async function getConnectionStatus(siteId: string): Promise<FacebookStatus> {
  if (!facebookConfigured()) {
    return { configured: false, connected: false, pageName: null, hasAdAccount: false, connectedAt: null };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("facebook_connections")
    .select("page_name, ad_account_id, connected_at")
    .eq("site_id", siteId)
    .maybeSingle();
  return {
    configured: true,
    connected: Boolean(data),
    pageName: (data?.page_name as string | undefined) ?? null,
    hasAdAccount: Boolean(data?.ad_account_id),
    connectedAt: (data?.connected_at as string | undefined) ?? null,
  };
}

async function getConnection(siteId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("facebook_connections")
    .select("page_id, page_name, page_access_token, ad_account_id")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("האתר אינו מחובר לעמוד פייסבוק. חברו אותו קודם בטאב הפרסום");
  return data as { page_id: string; page_name: string; page_access_token: string; ad_account_id: string | null };
}

/* ---------------------- פרסום לעמוד ---------------------- */

export async function publishListingToPage(
  listingId: string,
  message: string,
  userId: string,
  siteUrl: string,
): Promise<{ postId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .select("id, site_id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !listing) throw new Error("הנכס לא נמצא");
  if (!listing.site_id) throw new Error("הנכס אינו משויך לאתר סוכן");

  const conn = await getConnection(listing.site_id as string);

  const { fetchListingImages } = await import("@/lib/listing-images.server");
  const imagesMap = await fetchListingImages([listingId]);
  const imageUrls = (imagesMap.get(listingId) ?? [])
    .map((i) => i.url)
    .filter((u) => u.startsWith("http"))
    .slice(0, 8);

  const record = async (status: "success" | "error", fbPostId?: string, errMsg?: string) => {
    await supabaseAdmin.from("listing_posts").insert({
      listing_id: listingId,
      target: "page",
      status,
      fb_post_id: fbPostId ?? null,
      error: errMsg ?? null,
      created_by: userId,
    });
  };

  try {
    // העלאת התמונות כלא-מפורסמות ואז פוסט אחד שמאגד אותן
    const mediaIds: string[] = [];
    for (const url of imageUrls) {
      const photo = await graph<{ id: string }>(`/${conn.page_id}/photos`, {
        url,
        published: "false",
        access_token: conn.page_access_token,
      }, "POST");
      mediaIds.push(photo.id);
    }

    const params: Record<string, string> = {
      message,
      access_token: conn.page_access_token,
    };
    if (mediaIds.length) {
      mediaIds.forEach((id, i) => {
        params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
      });
    } else {
      params["link"] = siteUrl;
    }

    const post = await graph<{ id: string }>(`/${conn.page_id}/feed`, params, "POST");
    await record("success", post.id);
    return { postId: post.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await record("error", undefined, msg);
    throw new Error(msg);
  }
}

/* ---------------------- קמפיין ממומן (תמיד PAUSED) ---------------------- */

export type CampaignParams = {
  dailyBudgetIls: number;
  durationDays: number;
  radiusKm: number;
  ageMin: number;
  ageMax: number;
};

export async function createPausedCampaign(
  listingId: string,
  message: string,
  params: CampaignParams,
  userId: string,
  siteUrl: string,
): Promise<{ campaignId: string; adsManagerUrl: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .select("id, site_id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !listing) throw new Error("הנכס לא נמצא");
  if (!listing.site_id) throw new Error("הנכס אינו משויך לאתר סוכן");

  const conn = await getConnection(listing.site_id as string);
  if (!conn.ad_account_id) throw new Error("לא חובר חשבון מודעות (Ad Account) — נדרש לקמפיין ממומן");
  const act = conn.ad_account_id.startsWith("act_") ? conn.ad_account_id : `act_${conn.ad_account_id}`;
  const token = conn.page_access_token;

  const record = async (status: "success" | "error", campaignId?: string, errMsg?: string) => {
    await supabaseAdmin.from("listing_posts").insert({
      listing_id: listingId,
      target: "campaign",
      status,
      fb_campaign_id: campaignId ?? null,
      error: errMsg ?? null,
      created_by: userId,
    });
  };

  try {
    // כל האובייקטים נוצרים במצב PAUSED — ההפעלה (וההוצאה הכספית) ידנית בלבד
    const campaign = await graph<{ id: string }>(`/${act}/campaigns`, {
      name: `נכס: ${listing.title}`.slice(0, 100),
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: JSON.stringify(["HOUSING"]),
      access_token: token,
    }, "POST");

    const start = new Date();
    const end = new Date(start.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
    const adset = await graph<{ id: string }>(`/${act}/adsets`, {
      name: `קהל: ${listing.title}`.slice(0, 100),
      campaign_id: campaign.id,
      daily_budget: String(Math.round(params.dailyBudgetIls * 100)),
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "PAUSED",
      targeting: JSON.stringify({
        geo_locations: {
          custom_locations: [
            { latitude: 32.3303316, longitude: 34.8567176, radius: params.radiusKm, distance_unit: "kilometer" },
          ],
        },
        age_min: params.ageMin,
        age_max: params.ageMax,
      }),
      access_token: token,
    }, "POST");

    const creative = await graph<{ id: string }>(`/${act}/adcreatives`, {
      name: `קריאייטיב: ${listing.title}`.slice(0, 100),
      object_story_spec: JSON.stringify({
        page_id: conn.page_id,
        link_data: { message, link: siteUrl },
      }),
      access_token: token,
    }, "POST");

    await graph<{ id: string }>(`/${act}/ads`, {
      name: `מודעה: ${listing.title}`.slice(0, 100),
      adset_id: adset.id,
      creative: JSON.stringify({ creative_id: creative.id }),
      status: "PAUSED",
      access_token: token,
    }, "POST");

    await record("success", campaign.id);
    return {
      campaignId: campaign.id,
      adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${act.replace("act_", "")}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await record("error", undefined, msg);
    throw new Error(msg);
  }
}
