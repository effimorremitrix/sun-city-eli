import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  Clock,
  Copy,
  Database,
  Eye,
  Play,
  RefreshCw,
  ServerCog,
  ShieldBan,
} from "lucide-react";
import {
  adminRevealCronSecret,
  adminRunJob,
  adminSystemStatus,
  adminUnblockKey,
  type JobRunRow,
} from "@/lib/system.functions";

/* ============================================================
 * טאב "מערכת" (מנהל ראשי): בריאות הרכיבים, המתזמן, ריצות אחרונות,
 * גיבויים, חסימות פעילות והרצה ידנית של משימות.
 * ============================================================ */

const JOBS: Array<{ name: string; label: string; suggested: string; desc: string }> = [
  {
    name: "market-scan",
    label: "סריקת שוק",
    suggested: "כל 6 שעות",
    desc: "מביאה מודעות מהשוק לפי ביקוש הלקוחות",
  },
  {
    name: "scout",
    label: "סוכן הסריקה",
    suggested: "פעם ביום (06:00)",
    desc: "סורק מקורות ומייצר טיוטות נכסים",
  },
  {
    name: "match-profiles",
    label: "התאמת פרופילים",
    suggested: "כל שעה",
    desc: "מתאים נכסים חדשים לפרופילי החיפוש",
  },
  {
    name: "notify-pending",
    label: "שליחת התראות ממתינות",
    suggested: "כל 15 דקות",
    desc: "שולחת מייל/וואטסאפ שממתינים בתור",
  },
  { name: "backup", label: "גיבוי", suggested: "פעם ביום (03:00)", desc: "מגבה את הטבלאות לאחסון" },
  {
    name: "health-check",
    label: "בדיקת בריאות",
    suggested: "כל שעה",
    desc: "בודקת רכיבים ושולחת התראה כשמשהו נופל",
  },
];

const jobLabel = (name: string) => JOBS.find((j) => j.name === name)?.label ?? name;

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
    : "אין מידע";

const fmtDuration = (start: string, end: string | null) => {
  if (!end) return "רץ…";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  return ms < 1000
    ? `${ms} מ"ש`
    : ms < 60_000
      ? `${(ms / 1000).toFixed(1)} שנ'`
      : `${Math.round(ms / 60_000)} דק'`;
};

const fmtBytes = (n: number | null) => {
  if (n == null) return "אין מידע";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const statusClass = (status: string) => {
  if (status === "ok" || status === "success") return "bg-whatsapp/15 text-whatsapp";
  if (status === "failed" || status === "error") return "bg-destructive/10 text-destructive";
  if (status === "running") return "bg-sun/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const parseSummary = (s: string): Record<string, unknown> => {
  try {
    const v = JSON.parse(s) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

/** המספרים העיקריים מסיכום הריצה — לשורה קצרה אחרי הרצה ידנית */
const summaryNumbers = (summary: Record<string, unknown>) =>
  Object.entries(summary)
    .filter(([, v]) => typeof v === "number" || typeof v === "boolean")
    .map(([k, v]) => `${k}: ${typeof v === "boolean" ? (v ? "כן" : "לא") : String(v)}`)
    .join(" · ");

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-primary">
        <Icon className="size-4 text-sun" aria-hidden="true" />
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function AdminSystem() {
  const fetchStatus = useServerFn(adminSystemStatus);
  const runJob = useServerFn(adminRunJob);
  const revealSecret = useServerFn(adminRevealCronSecret);
  const unblock = useServerFn(adminUnblockKey);

  const status = useQuery({ queryKey: ["admin-system-status"], queryFn: () => fetchStatus() });

  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openRun, setOpenRun] = useState<number | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const s = status.data;

  const run = async (job: string) => {
    setBusyJob(job);
    setErr(null);
    try {
      const r = await runJob({ data: { job } });
      const nums = summaryNumbers(parseSummary(r.summary));
      setJobResults((m) => ({
        ...m,
        [job]: {
          ok: r.ok,
          text: r.ok
            ? nums || "הסתיים בהצלחה"
            : `נכשל: ${r.error ?? "שגיאה"}${nums ? ` (${nums})` : ""}`,
        },
      }));
      await status.refetch();
    } catch (e) {
      setJobResults((m) => ({
        ...m,
        [job]: { ok: false, text: e instanceof Error ? e.message : "הריצה נכשלה" },
      }));
    } finally {
      setBusyJob(null);
    }
  };

  const reveal = async () => {
    setErr(null);
    try {
      const r = await revealSecret();
      setSecret(r.secret ?? "(לא הוגדר סוד — הריצו את המיגרציה או הגדירו SCOUT_CRON_SECRET)");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setErr("ההעתקה נכשלה — העתיקו ידנית");
    }
  };

  const release = async (key: string) => {
    setBusyKey(key);
    setErr(null);
    try {
      await unblock({ data: { key } });
      await status.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <ServerCog className="size-5 text-sun" aria-hidden="true" />
          מערכת
        </h2>
        <button
          type="button"
          disabled={status.isFetching}
          onClick={() => void status.refetch()}
          className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-60"
        >
          <RefreshCw
            className={`size-3.5 ${status.isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          רענון
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        האם המערכת באמת עובדת: רכיבים, משימות מתוזמנות, גיבויים וחסימות. כאן רואים אם משהו נפל לפני
        שלקוח מתלונן.
      </p>

      {status.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען…</p>}
      {status.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת המצב נכשלה: {status.error instanceof Error ? status.error.message : ""}
        </p>
      )}
      {err && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {s && (
        <div className="mt-4 grid gap-4">
          {/* בריאות */}
          <Card title={`בריאות ${s.health.ok ? "✅ תקין" : "❌ יש בעיה"}`} icon={Activity}>
            <p className="text-xs text-muted-foreground">נבדק: {fmtDateTime(s.health.checkedAt)}</p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {s.health.components.map((c) => (
                <li key={c.name} className="flex items-start gap-2 rounded-xl bg-secondary/50 p-2">
                  <span aria-hidden="true">{c.ok ? "✅" : "❌"}</span>
                  <span className="min-w-0">
                    <span className="font-bold text-primary">{c.name}</span>
                    {c.detail && (
                      <span
                        className={`block break-words text-xs ${c.ok ? "text-muted-foreground" : "text-destructive"}`}
                        dir="auto"
                      >
                        {c.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* מתזמן */}
          <Card title="מתזמן" icon={Clock}>
            {s.scheduler.available ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-xs">
                  <thead>
                    <tr className="border-b border-border font-bold text-muted-foreground">
                      {["משימה", "תזמון", "פעיל", "סטטוס אחרון", "ריצה אחרונה"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-start">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.scheduler.jobs.map((j) => (
                      <tr key={j.name} className="border-b border-border/60">
                        <td className="px-2 py-1.5 font-bold text-primary">{jobLabel(j.name)}</td>
                        <td className="px-2 py-1.5" dir="ltr">
                          {j.schedule}
                        </td>
                        <td className="px-2 py-1.5">{j.active ? "כן" : "לא"}</td>
                        <td className="px-2 py-1.5">
                          {j.lastStatus ? (
                            <span
                              className={`rounded-full px-2 py-0.5 font-bold ${statusClass(j.lastStatus)}`}
                            >
                              {j.lastStatus}
                            </span>
                          ) : (
                            "אין מידע"
                          )}
                        </td>
                        <td className="px-2 py-1.5">{fmtDateTime(j.lastRun)}</td>
                      </tr>
                    ))}
                    {s.scheduler.jobs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-2 text-muted-foreground">
                          pg_cron זמין אבל לא הוגדרו משימות — הריצו את המיגרציה של המתזמן.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-xs text-orange-900">
                <p className="flex items-start gap-1.5 font-bold">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  המתזמן הפנימי (pg_cron) לא זמין במסד הזה
                  {s.scheduler.error ? ` (${s.scheduler.error})` : ""}. בלי מתזמן, המשימות רצות רק
                  ידנית מכאן.
                </p>
                <p className="mt-2 leading-relaxed">
                  פתרון: מתזמן חיצוני (למשל cron-job.org, GitHub Actions או Cloudflare Cron) ששולח
                  בקשת <code dir="ltr">POST</code> אל{" "}
                  <code dir="ltr" className="break-all">
                    {s.jobUrl}
                  </code>{" "}
                  עם הכותרת <code dir="ltr">x-cron-secret</code> שערכה הסוד שלמטה. במקום{" "}
                  <code dir="ltr">&lt;name&gt;</code> שמים את שם המשימה.
                </p>
                <ul className="mt-2 grid gap-0.5 sm:grid-cols-2">
                  {JOBS.map((j) => (
                    <li key={j.name}>
                      <code dir="ltr">{j.name}</code> — {j.suggested}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {secret ? (
                    <>
                      <code
                        dir="ltr"
                        className="rounded-lg bg-card px-2 py-1 text-[11px] break-all"
                      >
                        {secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copySecret()}
                        className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-card px-2.5 py-1.5 font-bold text-primary"
                      >
                        <Copy className="size-3.5" aria-hidden="true" />
                        {copied ? "הועתק ✓" : "העתקה"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecret(null)}
                        className="font-bold underline"
                      >
                        הסתרה
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void reveal()}
                      className="inline-flex items-center gap-1 rounded-xl bg-sun px-3 py-1.5 font-bold text-sun-foreground"
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                      הצג סוד
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] opacity-80">
                  הסוד לא נרשם ביומן, אבל כל מי שמחזיק בו יכול להריץ משימות — לא לשתף.
                </p>
              </div>
            )}
          </Card>

          {/* הרצה ידנית */}
          <Card title="הרצה ידנית" icon={Play}>
            <p className="text-xs text-muted-foreground">
              הריצה מתבצעת עכשיו ונרשמת ב"ריצות אחרונות". סריקת שוק וסוכן הסריקה עשויות לקחת דקה
              ולעלות כסף.
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {JOBS.map((j) => {
                const r = jobResults[j.name];
                return (
                  <li key={j.name} className="rounded-xl bg-secondary/50 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="text-sm font-bold text-primary">{j.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{j.desc}</span>
                      </span>
                      <button
                        type="button"
                        disabled={busyJob != null}
                        onClick={() => void run(j.name)}
                        className="inline-flex items-center gap-1 rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
                      >
                        <Play className="size-3.5" aria-hidden="true" />
                        {busyJob === j.name ? "רץ…" : "הרצה"}
                      </button>
                    </div>
                    {r && (
                      <p
                        className={`mt-1.5 break-words text-xs font-semibold ${r.ok ? "text-whatsapp" : "text-destructive"}`}
                        dir="auto"
                      >
                        {r.text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* ריצות אחרונות */}
          <Card title="ריצות אחרונות" icon={Clock}>
            {s.runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">עדיין לא נרשמו ריצות.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-xs">
                  <thead>
                    <tr className="border-b border-border font-bold text-muted-foreground">
                      {["משימה", "הפעלה", "התחלה", "משך", "סטטוס", "שגיאה", ""].map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-start">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.runs.map((r: JobRunRow) => (
                      <RunRow
                        key={r.id}
                        run={r}
                        open={openRun === r.id}
                        onToggle={() => setOpenRun(openRun === r.id ? null : r.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* גיבויים */}
          <Card title="גיבויים" icon={Database}>
            {s.backups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                אין קובצי גיבוי עדיין — הריצו "גיבוי" ידנית או המתינו לריצה המתוזמנת.
              </p>
            ) : (
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {s.backups.map((b) => (
                  <li
                    key={b.name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/50 px-2.5 py-1.5"
                  >
                    <span dir="ltr" className="truncate font-semibold text-primary">
                      {b.name}
                    </span>
                    <span className="text-muted-foreground">
                      {fmtBytes(b.size)} · {fmtDateTime(b.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              שחזור: מריצים מקומית{" "}
              <code dir="ltr">npx tsx scripts/restore-backup.ts &lt;שם הקובץ&gt;</code> עם משתני
              הסביבה <code dir="ltr">SUPABASE_URL</code> ו-
              <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> (מפתח ה-service role, לא המפתח
              הציבורי). השחזור דורס נתונים — לעשות רק אחרי גיבוי טרי.
            </p>
          </Card>

          {/* חסימות */}
          <Card title={`חסימות פעילות (${s.blocked.length})`} icon={ShieldBan}>
            {s.blocked.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין חסימות פעילות.</p>
            ) : (
              <ul className="grid gap-1 text-xs">
                {s.blocked.map((b) => (
                  <li
                    key={b.key}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-secondary/50 px-2.5 py-1.5"
                  >
                    <span dir="ltr" className="font-semibold text-primary">
                      {b.key}
                    </span>
                    <span className="text-muted-foreground">
                      {b.reason ?? "ללא סיבה"} · {b.hits} פגיעות · עד {fmtDateTime(b.until)}
                    </span>
                    <button
                      type="button"
                      disabled={busyKey === b.key}
                      onClick={() => void release(b.key)}
                      className="ms-auto rounded-xl border border-primary/30 px-2.5 py-1 font-bold text-primary disabled:opacity-50"
                    >
                      {busyKey === b.key ? "משחרר…" : "שחרור"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}

function RunRow({ run, open, onToggle }: { run: JobRunRow; open: boolean; onToggle: () => void }) {
  const summary = parseSummary(run.summary);
  return (
    <>
      <tr className="border-b border-border/60 align-top">
        <td className="px-2 py-1.5 font-bold text-primary">{jobLabel(run.job)}</td>
        <td className="px-2 py-1.5">
          {run.trigger === "manual"
            ? "ידני"
            : run.trigger === "cron"
              ? "מתזמן"
              : (run.trigger ?? "אין מידע")}
        </td>
        <td className="px-2 py-1.5">{fmtDateTime(run.started_at)}</td>
        <td className="px-2 py-1.5">{fmtDuration(run.started_at, run.finished_at)}</td>
        <td className="px-2 py-1.5">
          <span className={`rounded-full px-2 py-0.5 font-bold ${statusClass(run.status)}`}>
            {run.status}
          </span>
        </td>
        <td
          className="max-w-56 truncate px-2 py-1.5 text-destructive"
          title={run.error ?? undefined}
          dir="auto"
        >
          {run.error ?? ""}
        </td>
        <td className="px-2 py-1.5">
          <button type="button" onClick={onToggle} className="font-bold text-primary underline">
            {open ? "סגירה" : "פרטים"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border/60">
          <td colSpan={7} className="px-2 py-2">
            <pre
              dir="ltr"
              className="max-h-64 overflow-auto rounded-xl bg-secondary/50 p-2 text-[11px] leading-relaxed"
            >
              {JSON.stringify(summary, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
