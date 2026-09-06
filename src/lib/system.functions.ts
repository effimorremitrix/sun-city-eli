import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppSettings } from "@/lib/settings.server";
import type { HealthReport, JobName } from "@/lib/jobs.server";

/**
 * ============================================================
 * פונקציות השרת של טאבי "הגדרות", "מערכת" ו"יומן פעילות" — מנהל ראשי
 * (הגדרות/מערכת) ומנהלי דפים (יומן, בהיקף הדף שלהם).
 * ============================================================
 */

export type ActivityRow = {
  id: number;
  kind: string;
  event: string;
  status: string;
  site_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  listing_id: string | null;
  market_listing_id: string | null;
  channel: string | null;
  recipient: string | null;
  message: string | null;
  error: string | null;
  created_at: string;
};

/** יומן הפעילות: מנהל ראשי רואה הכול, סוכן רק את הדף שלו (RLS) */
export const adminListActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: {
      siteId?: string | null;
      kind?: string | null;
      onlyFailed?: boolean;
      q?: string | null;
      limit?: number;
      before?: string | null;
    }) => ({
      siteId: input?.siteId ? String(input.siteId) : null,
      kind: input?.kind ? String(input.kind).slice(0, 20) : null,
      onlyFailed: input?.onlyFailed === true,
      q: input?.q ? String(input.q).trim().slice(0, 80) : null,
      limit: Math.min(300, Math.max(20, Number(input?.limit ?? 120) || 120)),
      before: input?.before ? String(input.before) : null,
    }),
  )
  .handler(async ({ data, context }): Promise<ActivityRow[]> => {
    const { assertManager } = await import("@/lib/admin.server");
    const access = await assertManager(context);
    let q = context.supabase
      .from("activity_log")
      .select(
        "id, kind, event, status, site_id, contact_id, lead_id, listing_id, market_listing_id, channel, recipient, message, error, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.siteId) {
      if (!access.sites.some((s) => s.id === data.siteId)) throw new Error("Forbidden");
      q = q.eq("site_id", data.siteId);
    }
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.onlyFailed) q = q.eq("status", "failed");
    if (data.q) {
      const term = data.q.replace(/[%_,()"']/g, "");
      if (term) q = q.or(`message.ilike.%${term}%,event.ilike.%${term}%,error.ilike.%${term}%`);
    }
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as ActivityRow[];
  });

/** ההגדרות הנוכחיות (בלי הסוד של המתזמן) — מנהל ראשי */
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ settings: Omit<AppSettings, "cron_secret">; models: string[] }> => {
      const { assertSuperAdmin } = await import("@/lib/admin.server");
      await assertSuperAdmin(context);
      const { getSettings } = await import("@/lib/settings.server");
      const { SELECTABLE_MODELS } = await import("@/lib/ai-usage.server");
      const { cron_secret: _secret, ...rest } = await getSettings({ fresh: true });
      void _secret;
      return { settings: rest, models: SELECTABLE_MODELS };
    },
  );

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patch: Record<string, string | number | boolean> }) => ({
    patch: (input?.patch ?? {}) as Record<string, string | number | boolean>,
  }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { updateSettings, EDITABLE_SETTING_KEYS } = await import("@/lib/settings.server");
    const patch: Partial<AppSettings> = {};
    for (const key of EDITABLE_SETTING_KEYS) {
      if (data.patch[key] !== undefined) (patch as Record<string, unknown>)[key] = data.patch[key];
    }
    const next = await updateSettings(patch, context.userId);
    const { logActivity } = await import("@/lib/activity.server");
    await logActivity({
      kind: "admin",
      event: "settings_updated",
      actorUserId: context.userId,
      message: `הגדרות עודכנו: ${Object.keys(patch).join(", ")}`,
      metadata: patch as Record<string, unknown>,
    });
    const { cron_secret: _secret, ...rest } = next;
    void _secret;
    return { settings: rest };
  });

export type JobRunRow = {
  id: number;
  job: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  /** סיכום הריצה כ-JSON (מחרוזת — כדי לעבור סריאליזציה של TanStack) */
  summary: string;
  error: string | null;
  trigger: string | null;
};

export type SystemStatus = {
  health: HealthReport;
  scheduler: {
    available: boolean;
    error?: string;
    jobs: Array<{
      name: string;
      schedule: string;
      active: boolean;
      lastStatus: string | null;
      lastRun: string | null;
    }>;
  };
  runs: JobRunRow[];
  backups: Array<{ name: string; size: number | null; createdAt: string | null }>;
  blocked: Array<{ key: string; reason: string | null; until: string; hits: number }>;
  jobUrl: string;
};

/** מצב המערכת: בריאות, מתזמן, ריצות אחרונות, גיבויים, חסימות — מנהל ראשי */
export const adminSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemStatus> => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { healthReport } = await import("@/lib/jobs.server");
    const { getSettings } = await import("@/lib/settings.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [health, { data: scheduler }, { data: runs }, files, { data: blocked }, settings] =
      await Promise.all([
        healthReport(),
        supabaseAdmin.rpc("scheduler_status"),
        supabaseAdmin
          .from("job_runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(40),
        supabaseAdmin.storage
          .from("backups")
          .list("", { limit: 60, sortBy: { column: "name", order: "desc" } }),
        supabaseAdmin
          .from("blocked_keys")
          .select("key, reason, until, hits")
          .gt("until", new Date().toISOString())
          .order("until", { ascending: false })
          .limit(50),
        getSettings({ fresh: true }),
      ]);
    const sched = (scheduler ?? { available: false, jobs: [] }) as SystemStatus["scheduler"];
    return {
      health,
      scheduler: sched,
      runs: (runs ?? []).map((r) => ({
        id: r.id as number,
        job: r.job as string,
        started_at: r.started_at as string,
        finished_at: (r.finished_at as string | null) ?? null,
        status: r.status as string,
        summary: JSON.stringify(r.summary ?? {}),
        error: (r.error as string | null) ?? null,
        trigger: (r.trigger as string | null) ?? null,
      })),
      backups: (files.data ?? []).map((f) => ({
        name: f.name,
        size: (f.metadata as { size?: number } | null)?.size ?? null,
        createdAt: f.created_at ?? null,
      })),
      blocked: (blocked ?? []) as SystemStatus["blocked"],
      jobUrl: `${settings.site_url}/api/public/jobs/<name>`,
    };
  });

/** הרצה ידנית של משימה — מנהל ראשי */
export const adminRunJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { job: string }) => ({ job: String(input?.job ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { isJobName, runJob } = await import("@/lib/jobs.server");
    if (!isJobName(data.job)) throw new Error("משימה לא מוכרת");
    const result = await runJob(data.job as JobName, "manual");
    return {
      ok: result.ok,
      summary: JSON.stringify(result.summary ?? {}),
      error: result.error ?? null,
    };
  });

/** הסוד למתזמן חיצוני (רק כשאין pg_cron) — מנהל ראשי, לא נרשם ביומן */
export const adminRevealCronSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { getCronSecret } = await import("@/lib/settings.server");
    return { secret: await getCronSecret() };
  });

export const adminUnblockKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => ({ key: String(input?.key ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("blocked_keys").delete().eq("key", data.key);
    return { ok: true };
  });

/** הודעת בדיקה לסוכן (מייל + וואטסאפ) — מראה מיד מה עובד ומה לא */
export const adminSendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => ({ siteId: String(input?.siteId ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { agentChannels, sendEmailLogged, sendWaLogged } = await import("@/lib/notify.server");
    const { getSettings } = await import("@/lib/settings.server");
    const settings = await getSettings();
    const agent = await agentChannels(data.siteId);
    if (!agent) throw new Error("הדף לא נמצא");
    const results: { email: string; whatsapp: string } = {
      email: "לא מוגדר מייל להתראות",
      whatsapp: "לא מוגדר וואטסאפ להתראות",
    };
    if (agent.email) {
      const r = await sendEmailLogged(
        {
          to: agent.email,
          subject: "בדיקת התראות — סאן סיטי",
          html: `<p dir="rtl">זו הודעת בדיקה מהמערכת. אם קיבלת אותה, התראות במייל עובדות. ${settings.site_url}</p>`,
        },
        { event: "test_notification", siteId: data.siteId },
      );
      results.email = r.sent ? `נשלח ל-${agent.email}` : `נכשל: ${r.reason ?? "unknown"}`;
    }
    if (agent.whatsapp) {
      const r = await sendWaLogged(
        agent.whatsapp,
        "client_callback",
        {
          action: "בדיקת מערכת",
          clientName: "בדיקה",
          clientPhone: "050-0000000",
          title: "הודעת בדיקה — אין לקוח אמיתי",
          criteria: "בדיקת תצורה",
          listingUrl: settings.site_url,
          leadUrl: `${settings.site_url}/account?tab=leads`,
        },
        { event: "test_notification", siteId: data.siteId },
      );
      results.whatsapp = r.sent
        ? `נשלח ל-${agent.whatsapp}`
        : `${r.error ? "נכשל" : "דולג"}: ${r.error ?? r.skipped ?? "unknown"}`;
    }
    return results;
  });

/** ערוצי ההתראות של דף (מייל/וואטסאפ) — מנהל הדף או מנהל ראשי */
export const adminUpdateSiteNotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { siteId: string; notifyEmail: string | null; notifyWhatsapp: string | null }) => ({
      siteId: String(input?.siteId ?? ""),
      notifyEmail: input?.notifyEmail ? String(input.notifyEmail).trim().slice(0, 120) : null,
      notifyWhatsapp: input?.notifyWhatsapp
        ? String(input.notifyWhatsapp).trim().slice(0, 30)
        : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    if (data.notifyEmail && !data.notifyEmail.includes("@")) throw new Error("כתובת מייל לא תקינה");
    if (data.notifyWhatsapp) {
      const { isValidIsraeliPhone } = await import("@/lib/leads");
      if (!isValidIsraeliPhone(data.notifyWhatsapp)) throw new Error("מספר וואטסאפ לא תקין");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sites")
      .update({ notify_email: data.notifyEmail, notify_whatsapp: data.notifyWhatsapp })
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SiteDiagnostics = Array<{
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  notify_email: string | null;
  notify_whatsapp: string | null;
  ownerEmail: string | null;
  ownerIsAdmin: boolean;
  listings: number;
  sold: number;
  openLeads: number;
}>;

/** אבחון דפים: מי הבעלים, האם יש ערוצי התראות, כמה נכסים/לידים — מנהל ראשי */
export const adminSiteDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SiteDiagnostics> => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { CLOSED_LEAD_STATUSES } = await import("@/lib/leads");
    const [
      { data: sites },
      { data: roles },
      { data: profiles },
      { data: listings },
      { data: sold },
      { data: leads },
    ] = await Promise.all([
      supabaseAdmin
        .from("sites")
        .select("id, slug, name, is_active, owner_id, notify_email, notify_whatsapp")
        .order("sort_order"),
      supabaseAdmin.from("user_roles").select("user_id, role").in("role", ["admin", "super_admin"]),
      supabaseAdmin.from("profiles").select("id, email"),
      supabaseAdmin.from("listings").select("site_id"),
      supabaseAdmin.from("sold_properties").select("site_id"),
      supabaseAdmin.from("leads").select("site_id, status"),
    ]);
    const adminIds = new Set((roles ?? []).map((r) => r.user_id as string));
    const emailById = new Map(
      (profiles ?? []).map((p) => [p.id as string, p.email as string | null]),
    );
    const closed = new Set(CLOSED_LEAD_STATUSES as readonly string[]);
    const count = (rows: Array<{ site_id: string | null }> | null, id: string) =>
      (rows ?? []).filter((r) => r.site_id === id).length;
    return (sites ?? []).map((s) => ({
      id: s.id as string,
      slug: s.slug as string,
      name: s.name as string,
      is_active: s.is_active as boolean,
      notify_email: (s.notify_email as string | null) ?? null,
      notify_whatsapp: (s.notify_whatsapp as string | null) ?? null,
      ownerEmail: emailById.get(s.owner_id as string) ?? null,
      ownerIsAdmin: adminIds.has(s.owner_id as string),
      listings: count(listings as never, s.id as string),
      sold: count(sold as never, s.id as string),
      openLeads: (leads ?? []).filter((l) => l.site_id === s.id && !closed.has(l.status as string))
        .length,
    }));
  });
