import { getSettings, getCronSecret } from "@/lib/settings.server";
import { logActivity } from "@/lib/activity.server";

/**
 * ============================================================
 * המשימות המתוזמנות של המערכת. נקראות מ-/api/public/jobs/<name> (pg_cron
 * דרך pg_net, או מתזמן חיצוני, או ידנית מטאב "מערכת"). כל ריצה נרשמת
 * ב-job_runs עם סיכום ושגיאה — כך יודעים שהמערכת באמת עובדת.
 * ============================================================
 */

export const JOB_NAMES = [
  "market-scan",
  "scout",
  "match-profiles",
  "notify-pending",
  "backup",
  "health-check",
] as const;
export type JobName = (typeof JOB_NAMES)[number];

export const isJobName = (v: string): v is JobName => (JOB_NAMES as readonly string[]).includes(v);

export type JobResult = { ok: boolean; summary: Record<string, unknown>; error?: string | null };

/** אימות הסוד של המתזמן: מהמסד (app_settings) או ממשתנה הסביבה הישן */
export async function verifyCronSecret(provided: string | null): Promise<boolean> {
  if (!provided) return false;
  const secrets = [await getCronSecret(), process.env["SCOUT_CRON_SECRET"] ?? null].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  return secrets.some((s) => s.length === provided.length && s === provided);
}

async function jobMarketScan(): Promise<JobResult> {
  const { runMarketScan } = await import("@/lib/market-scan.server");
  const summary = await runMarketScan();
  return {
    ok: summary.tasksRun > 0 || summary.errors.length === 0,
    summary: summary as unknown as Record<string, unknown>,
    error: summary.errors[0] ?? null,
  };
}

async function jobScout(): Promise<JobResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profiles, error } = await supabaseAdmin
    .from("scout_profiles")
    .select("*")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  if (!profiles?.length) return { ok: true, summary: { scanned: 0, inserted: 0 } };
  const { runScoutForProfiles } = await import("@/lib/scout-run.server");
  const result = await runScoutForProfiles(supabaseAdmin as never, profiles as never, null);
  return {
    ok: result.errors.length === 0,
    summary: { scanned: result.scanned, found: result.found, inserted: result.inserted },
    error: result.errors[0] ?? null,
  };
}

async function jobMatchProfiles(): Promise<JobResult> {
  const { matchNewMarketListings } = await import("@/lib/market-scan.server");
  const matched = await matchNewMarketListings(26);
  const settings = await getSettings();
  const { sendAllPendingNotifications } = await import("@/lib/notify.server");
  const sent = await sendAllPendingNotifications(settings.site_url);
  return { ok: true, summary: { matched, ...sent } };
}

async function jobNotifyPending(): Promise<JobResult> {
  const settings = await getSettings();
  const { sendAllPendingNotifications } = await import("@/lib/notify.server");
  const sent = await sendAllPendingNotifications(settings.site_url);
  return { ok: true, summary: sent as unknown as Record<string, unknown> };
}

/* ------------------------------ גיבוי ------------------------------ */

const BACKUP_TABLES = [
  "sites",
  "site_content",
  "site_items",
  "listings",
  "listing_images",
  "sold_properties",
  "contacts",
  "leads",
  "lead_events",
  "search_profiles",
  "listing_notifications",
  "listing_feedback",
  "market_listings",
  "profiles",
  "user_roles",
  "app_settings",
  "scout_profiles",
  "facebook_connections",
] as const;

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function jobBackup(): Promise<JobResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await getSettings();
  const dump: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("*")
        .range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    dump[table] = rows;
    counts[table] = rows.length;
  }
  const payload = JSON.stringify({
    version: 1,
    created_at: new Date().toISOString(),
    tables: dump,
  });
  const body = await gzip(payload);
  const name = `${new Date().toISOString().slice(0, 10)}.json.gz`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("backups")
    .upload(name, body, { contentType: "application/gzip", upsert: true });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  // שמירה לפי ימי הריטנשן
  let removed = 0;
  const { data: files } = await supabaseAdmin.storage.from("backups").list("", { limit: 1000 });
  const cutoff = Date.now() - settings.backup_retention_days * 24 * 3600_000;
  const old = (files ?? []).filter((f) => {
    const day = f.name.slice(0, 10);
    const t = Date.parse(day);
    return Number.isFinite(t) && t < cutoff;
  });
  if (old.length) {
    const { error } = await supabaseAdmin.storage.from("backups").remove(old.map((f) => f.name));
    if (!error) removed = old.length;
  }
  return { ok: true, summary: { file: name, bytes: body.byteLength, counts, removed } };
}

/* --------------------------- בדיקת בריאות --------------------------- */

export type HealthComponent = { name: string; ok: boolean; detail: string | null };
export type HealthReport = { ok: boolean; checkedAt: string; components: HealthComponent[] };

async function lastRun(job: string): Promise<{ at: string; status: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("job_runs")
    .select("started_at, status")
    .eq("job", job)
    .neq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { at: data.started_at as string, status: data.status as string } : null;
}

const hoursAgo = (iso: string) => (Date.now() - Date.parse(iso)) / 3600_000;

export async function healthReport(): Promise<HealthReport> {
  const components: HealthComponent[] = [];
  const push = (name: string, ok: boolean, detail: string | null = null) =>
    components.push({ name, ok, detail });

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sites").select("id").limit(1);
    push("database", !error, error?.message ?? null);
    const { error: stErr } = await supabaseAdmin.storage.from("site-media").list("", { limit: 1 });
    push("storage", !stErr, stErr?.message ?? null);
  } catch (e) {
    push("database", false, e instanceof Error ? e.message : String(e));
  }

  push(
    "ai_key",
    Boolean(process.env["ANTHROPIC_API_KEY"]),
    process.env["ANTHROPIC_API_KEY"] ? null : "ANTHROPIC_API_KEY חסר",
  );
  push(
    "email",
    Boolean(process.env["RESEND_API_KEY"]),
    process.env["RESEND_API_KEY"] ? null : "RESEND_API_KEY חסר — מיילים לא נשלחים",
  );
  try {
    const { whatsappConfigured } = await import("@/lib/whatsapp.server");
    const configured = whatsappConfigured();
    push(
      "whatsapp",
      configured,
      configured ? null : "ספק וואטסאפ לא מוגדר — התראות וואטסאפ מדולגות",
    );
  } catch (e) {
    push("whatsapp", false, e instanceof Error ? e.message : String(e));
  }

  const settings = await getSettings();
  const scan = await lastRun("market-scan");
  push(
    "market_scan",
    !settings.market_scan_enabled || (scan != null && hoursAgo(scan.at) < 30),
    scan ? `ריצה אחרונה: ${scan.at} (${scan.status})` : "טרם רצה",
  );
  const match = await lastRun("match-profiles");
  push(
    "match_profiles",
    match != null && hoursAgo(match.at) < 30,
    match ? `ריצה אחרונה: ${match.at} (${match.status})` : "טרם רצה",
  );
  const backup = await lastRun("backup");
  push(
    "backup",
    backup != null && backup.status === "ok" && hoursAgo(backup.at) < 30,
    backup ? `גיבוי אחרון: ${backup.at} (${backup.status})` : "טרם רץ",
  );

  // כשלי שליחה ב-24 השעות האחרונות
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await supabaseAdmin
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("kind", "notification")
      .eq("status", "failed")
      .gte("created_at", since);
    push(
      "notifications",
      (count ?? 0) === 0,
      count ? `${count} כשלי שליחה ב-24 השעות האחרונות` : null,
    );
  } catch {
    // לא קריטי
  }

  return { ok: components.every((c) => c.ok), checkedAt: new Date().toISOString(), components };
}

async function jobHealthCheck(): Promise<JobResult> {
  const report = await healthReport();
  const settings = await getSettings();
  const failing = report.components
    .filter((c) => !c.ok)
    .map((c) => c.name)
    .sort();
  const previous = await lastRun("health-check");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let prevFailing: string[] = [];
  if (previous) {
    const { data } = await supabaseAdmin
      .from("job_runs")
      .select("summary")
      .eq("job", "health-check")
      .neq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    prevFailing = ((data?.summary as { failing?: string[] } | null)?.failing ?? []).slice().sort();
  }
  const changed = JSON.stringify(failing) !== JSON.stringify(prevFailing);

  // התראה רק במעבר מצב (נשבר / חזר לעבוד) — לא בכל שעה
  if (changed && settings.health_alerts_enabled) {
    try {
      const { superAdminChannels, sendEmailLogged } = await import("@/lib/notify.server");
      const admins = await superAdminChannels();
      const lines = report.components
        .map((c) => `${c.ok ? "✅" : "❌"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`)
        .join("<br>");
      const subject = failing.length
        ? `⚠️ תקלה במערכת: ${failing.join(", ")}`
        : "✅ המערכת חזרה לעבוד תקין";
      const html = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;padding:24px"><h2 style="color:#1B2A41">${subject}</h2><p>${lines}</p><p style="color:#888;font-size:12px">${settings.site_url}/account?tab=system</p></body></html>`;
      for (const email of admins.emails) {
        await sendEmailLogged({ to: email, subject, html }, { event: "health_alert" });
      }
    } catch (e) {
      console.error("health alert failed", e instanceof Error ? e.message : e);
    }
  }
  return {
    ok: report.ok,
    summary: { failing, components: report.components, alerted: changed },
    error: failing.length ? `רכיבים לא תקינים: ${failing.join(", ")}` : null,
  };
}

const RUNNERS: Record<JobName, () => Promise<JobResult>> = {
  "market-scan": jobMarketScan,
  scout: jobScout,
  "match-profiles": jobMatchProfiles,
  "notify-pending": jobNotifyPending,
  backup: jobBackup,
  "health-check": jobHealthCheck,
};

/** מריץ משימה ורושם ב-job_runs. לעולם לא זורק — מחזיר את התוצאה */
export async function runJob(
  name: JobName,
  trigger: "cron" | "manual",
): Promise<JobResult & { runId: number | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: run } = await supabaseAdmin
    .from("job_runs")
    .insert({ job: name, trigger, status: "running" })
    .select("id")
    .single();
  const runId = (run?.id as number | undefined) ?? null;
  let result: JobResult;
  try {
    result = await RUNNERS[name]();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    result = { ok: false, summary: {}, error: message };
    await logActivity({
      kind: "job",
      event: name.replace(/-/g, "_"),
      status: "failed",
      error: message,
      message: `משימה ${name} נכשלה`,
    });
  }
  if (runId != null) {
    await supabaseAdmin
      .from("job_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: result.ok ? "ok" : "failed",
        summary: result.summary as never,
        error: result.error ?? null,
      })
      .eq("id", runId);
  }
  return { ...result, runId };
}
