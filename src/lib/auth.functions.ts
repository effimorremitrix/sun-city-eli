import { createServerFn } from "@tanstack/react-start";

/**
 * הרשמת לקוח דרך השרת (ולא ישירות מהדפדפן ל-Supabase): כך אפשר להגביל
 * קצב לפי IP/מכשיר, לזרוק honeypot, ולקשר את הנרשם ללקוח (contact) עם
 * הסוכן של המגע הראשון — עוד לפני שאישר את המייל.
 */
export const registerClient = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      email: string;
      password: string;
      fullName?: string | null;
      phone?: string | null;
      redirectTo?: string | null;
      website?: string | null;
      siteSlug?: string | null;
      sessionId?: string | null;
    }) => ({
      email: String(input?.email ?? "")
        .trim()
        .toLowerCase()
        .slice(0, 120),
      password: String(input?.password ?? "").slice(0, 200),
      fullName: String(input?.fullName ?? "")
        .trim()
        .slice(0, 80),
      phone: String(input?.phone ?? "")
        .trim()
        .slice(0, 30),
      redirectTo: String(input?.redirectTo ?? "").slice(0, 300),
      website: String(input?.website ?? "").slice(0, 200),
      siteSlug: String(input?.siteSlug ?? "").slice(0, 60),
      sessionId: String(input?.sessionId ?? "").slice(0, 60),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (data.website) return { ok: true }; // honeypot
    if (!data.email.includes("@") || data.password.length < 6) {
      return { ok: false, error: "invalid" };
    }
    const { enforceLimits, perHour } = await import("@/lib/rate-limit.server");
    const { getSettings } = await import("@/lib/settings.server");
    const settings = await getSettings();
    const limit = await enforceLimits({
      scope: "signup",
      ip: perHour(settings.signup_per_hour * 2, "signup"),
      device: perHour(settings.signup_per_hour, "signup"),
    });
    if (!limit.allowed) return { ok: false, error: "rate_limited" };

    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return { ok: false, error: "unavailable" };

    // הפניה חזרה רק לדומיין של האתר עצמו
    let redirect = `${settings.site_url}/account`;
    try {
      const u = new URL(data.redirectTo);
      if (
        u.origin === new URL(settings.site_url).origin ||
        u.hostname.endsWith(".lovable.app") ||
        u.hostname === "localhost"
      ) {
        redirect = u.toString();
      }
    } catch {
      // ברירת המחדל
    }

    const { data: signUp, error } = await db.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: redirect, data: { full_name: data.fullName } },
    });
    if (error) return { ok: false, error: error.message };

    const { logActivity } = await import("@/lib/activity.server");
    try {
      const { resolveContact } = await import("@/lib/contacts.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let pageSiteId: string | null = null;
      if (data.siteSlug) {
        const { data: s } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("slug", data.siteSlug)
          .eq("is_active", true)
          .maybeSingle();
        pageSiteId = (s?.id as string | undefined) ?? null;
      }
      const { contact } = await resolveContact({
        email: data.email,
        phone: data.phone || null,
        fullName: data.fullName || null,
        userId: signUp.user?.id ?? null,
        source: "הרשמה לאתר",
        pageSiteId,
      });
      await logActivity({
        kind: "client",
        event: "signup",
        siteId: contact.assigned_site_id,
        contactId: contact.id,
        message: `הרשמה: ${data.fullName || data.email}`,
      });
      // אירוע הרשמה למדידה — עם הסוכן של הלקוח (בדף /auth אין הקשר של דף)
      if (data.sessionId) {
        const { createHash } = await import("node:crypto");
        const salt = process.env["ANALYTICS_SALT"] || "sun-city-analytics";
        const sessionHash = createHash("sha256")
          .update(`${salt}:${data.sessionId}`)
          .digest("hex")
          .slice(0, 32);
        await supabaseAdmin.from("track_events").insert({
          site_id: contact.assigned_site_id,
          type: "signup",
          path: "/auth",
          session_hash: sessionHash,
        });
      }
    } catch (e) {
      console.error("registerClient contact link failed", e instanceof Error ? e.message : e);
    }
    return { ok: true };
  });
