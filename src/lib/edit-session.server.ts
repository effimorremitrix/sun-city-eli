import { useSession } from "@tanstack/react-start/server";

/** סשן עריכה ללקוח — נשמר בקוקי מוצפן, בלי חשבון ובלי סיסמה */
export type EditSessionData = {
  siteId?: string;
  role?: string;
  siteName?: string;
  siteSlug?: string;
};

function sessionConfig() {
  const password = process.env["SESSION_SECRET"];
  if (!password || password.length < 32) {
    throw new Error("חסר SESSION_SECRET בהגדרות השרת");
  }
  return {
    password,
    name: "site-edit",
    maxAge: 60 * 60 * 24 * 365,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export function editSession() {
  return useSession<EditSessionData>(sessionConfig());
}

/** גיבוב הקוד — בבסיס הנתונים נשמר רק ה-hash, לא הקוד עצמו */
export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * אימות סשן העריכה בשרת בכל בקשה: מוודא שהקישור עוד תקף (לא בוטל)
 * ומחזיר את מזהה האתר. שום נתון מהדפדפן לא נלקח בחשבון.
 */
export async function requireEditSite(): Promise<{ siteId: string; siteName: string; siteSlug: string }> {
  const session = await editSession();
  const siteId = session.data.siteId;
  if (!siteId) throw new Error("אין הרשאת עריכה. יש לפתוח מחדש את קישור העריכה.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: link } = await supabaseAdmin
    .from("site_edit_links")
    .select("id")
    .eq("site_id", siteId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (!link) {
    await session.clear();
    throw new Error("קישור העריכה בוטל. יש לבקש קישור חדש.");
  }

  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("id, name, slug")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) {
    await session.clear();
    throw new Error("האתר לא נמצא");
  }

  return { siteId: site.id, siteName: site.name, siteSlug: site.slug };
}
