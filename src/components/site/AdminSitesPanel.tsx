import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ExternalLink, Home, Link2, Power, Send } from "lucide-react";
import {
  adminGetHomeRedirect,
  adminSetHomeRedirect,
  adminSetSiteActive,
} from "@/lib/users.functions";
import {
  adminSendTestNotification,
  adminSiteDiagnostics,
  adminUpdateSiteNotify,
  type SiteDiagnostics,
} from "@/lib/system.functions";
import { OFFICE_SLUG } from "@/lib/site-data";
import type { ManagedSite } from "@/lib/admin.server";

type Props = {
  sites: ManagedSite[];
  /** רענון רשימת האתרים אחרי הפעלה/השבתה */
  onChanged: () => void;
};

/**
 * ניהול הדפים האישיים של הסוכנים (מנהל ראשי בלבד): הפעלה/השבתה של דף,
 * קישור צפייה ציבורי, וקישור ניהול ישיר שפותח את לוח הניהול על הדף של
 * הסוכן — אפשר לשמור אותו כסימנייה או לשלוח לעצמך.
 */
export default function AdminSitesPanel({ sites, onChanged }: Props) {
  const setActive = useServerFn(adminSetSiteActive);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const getHomeRedirect = useServerFn(adminGetHomeRedirect);
  const setHomeRedirect = useServerFn(adminSetHomeRedirect);
  const homeRedirect = useQuery({
    queryKey: ["admin-home-redirect"],
    queryFn: () => getHomeRedirect(),
  });
  const [homeBusy, setHomeBusy] = useState(false);
  const [homeConfirm, setHomeConfirm] = useState(false);

  const toggleHomeRedirect = async () => {
    setHomeBusy(true);
    setErr(null);
    try {
      await setHomeRedirect({ data: { enabled: !homeRedirect.data?.enabled } });
      await homeRedirect.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setHomeBusy(false);
      setHomeConfirm(false);
    }
  };

  const toggle = async (site: ManagedSite) => {
    setBusyId(site.id);
    setErr(null);
    try {
      await setActive({ data: { siteId: site.id, isActive: !site.is_active } });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const adminLink = (slug: string) => `${window.location.origin}/account?tab=content&site=${slug}`;

  // אבחון דפים: בעלים, ערוצי התראות ומונים — מוצג לכל דף
  const fetchDiagnostics = useServerFn(adminSiteDiagnostics);
  const diagnostics = useQuery({
    queryKey: ["admin-site-diagnostics"],
    queryFn: () => fetchDiagnostics(),
  });
  const diagById = new Map((diagnostics.data ?? []).map((d) => [d.id, d]));

  const copy = async (site: ManagedSite) => {
    setErr(null);
    try {
      await navigator.clipboard.writeText(adminLink(site.slug));
      setCopiedId(site.id);
      window.setTimeout(() => setCopiedId((id) => (id === site.id ? null : id)), 2500);
    } catch {
      setErr("ההעתקה נכשלה — אפשר להעתיק ידנית מהשורה בכתובת אחרי בחירת הדף בבורר");
    }
  };

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="text-lg font-extrabold text-primary">דפים אישיים</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        דף מושבת מפסיק להיפתר בכתובת שלו (404) והסוכן יורד מרשימת הסוכנים הציבורית — אבל הוא ממשיך
        להופיע במדור הצוות של האתר. "קישור ניהול" פותח את לוח הניהול ישירות על הדף של הסוכן (דורש
        התחברות כמנהל ראשי).
      </p>
      {err && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {/* מתג "הדף /eli-kalif הוא הדף הראשי" — הפניה קבועה מ-"/" אל דף המשרד */}
      <div className="mt-4 rounded-xl border border-border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 font-bold text-primary">
              <Home className="size-4" aria-hidden="true" />
              <span dir="ltr">/{OFFICE_SLUG}</span> כדף הראשי (הסתרת דף הבית)
            </span>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              homeRedirect.data?.enabled
                ? "bg-whatsapp/15 text-whatsapp"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {homeRedirect.isLoading ? "טוען…" : homeRedirect.data?.enabled ? "פעיל" : "כבוי"}
          </span>

          {homeConfirm ? (
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={homeBusy}
                onClick={() => void toggleHomeRedirect()}
                className="rounded-xl bg-destructive px-2.5 py-1.5 text-xs font-bold text-destructive-foreground disabled:opacity-60"
              >
                {homeBusy
                  ? "מעדכן…"
                  : homeRedirect.data?.enabled
                    ? "אישור כיבוי ההפניה"
                    : "אישור הפעלת ההפניה"}
              </button>
              <button
                type="button"
                disabled={homeBusy}
                onClick={() => setHomeConfirm(false)}
                className="text-xs font-bold text-muted-foreground underline"
              >
                ביטול
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={homeBusy || homeRedirect.isLoading}
              onClick={() => setHomeConfirm(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-2.5 py-1.5 text-xs font-bold text-destructive disabled:opacity-60"
            >
              <Power className="size-3.5" aria-hidden="true" />
              {homeRedirect.data?.enabled ? "כיבוי ההפניה" : "הפעלת ההפניה"}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          כשהאפשרות פעילה, דף הבית <span dir="ltr">"/"</span> (וגם <span dir="ltr">/en</span>{" "}
          <span dir="ltr">/fr</span> <span dir="ltr">/ru</span>) מפנה בהפניה קבועה (301) אל{" "}
          <span dir="ltr">/{OFFICE_SLUG}</span>, והכתובת הקנונית במנועי החיפוש עוברת אל{" "}
          <span dir="ltr">/{OFFICE_SLUG}</span>. כיבוי מחזיר את המצב לקדמותו מיידית — בלי דיפלוי.
        </p>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {sites.map((s) => {
          const isOffice = s.slug === OFFICE_SLUG;
          const busy = busyId === s.id;
          const diag = diagById.get(s.id) ?? null;
          return (
            <li key={s.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-primary">{s.name}</span>{" "}
                  <span dir="ltr" className="text-xs text-muted-foreground">
                    /{isOffice ? "" : s.slug}
                  </span>
                  {diag && (
                    <span className="ms-2 text-xs text-muted-foreground">
                      {diag.listings} נכסים · {diag.sold} נמכרו · {diag.openLeads} לידים פתוחים
                    </span>
                  )}
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    s.is_active
                      ? "bg-whatsapp/15 text-whatsapp"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {s.is_active ? "פעיל" : "מושבת"}
                </span>

                <a
                  href={isOffice ? "/" : `/${s.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-xl border border-primary/30 px-2.5 py-1.5 text-xs font-bold text-primary ${
                    s.is_active ? "" : "opacity-50"
                  }`}
                  title={s.is_active ? undefined : "הדף מושבת — הקישור יחזיר 404"}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  צפייה בדף
                </a>

                <button
                  type="button"
                  onClick={() => void copy(s)}
                  className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-2.5 py-1.5 text-xs font-bold text-primary"
                >
                  <Link2 className="size-3.5" aria-hidden="true" />
                  {copiedId === s.id ? "הקישור הועתק ✓" : "קישור ניהול"}
                </button>

                {!isOffice &&
                  (confirmId === s.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggle(s)}
                        className="rounded-xl bg-destructive px-2.5 py-1.5 text-xs font-bold text-destructive-foreground disabled:opacity-60"
                      >
                        {busy ? "מעדכן…" : s.is_active ? "אישור השבתה" : "אישור הפעלה"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmId(null)}
                        className="text-xs font-bold text-muted-foreground underline"
                      >
                        ביטול
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmId(s.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-2.5 py-1.5 text-xs font-bold text-destructive disabled:opacity-60"
                    >
                      <Power className="size-3.5" aria-hidden="true" />
                      {s.is_active ? "השבתת הדף" : "הפעלת הדף"}
                    </button>
                  ))}
              </div>

              {/* אזהרה: דף שהבעלים שלו הוא מנהל ולא סוכן — הסוכן לא יראה כלום */}
              {diag && diag.ownerIsAdmin && !isOffice && (
                <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-orange-300 bg-orange-50 p-2 text-xs font-semibold text-orange-900">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    הדף לא מקושר לחשבון סוכן — נכסים ולידים לא יופיעו אצל הסוכן. הבעלים כרגע:{" "}
                    <span dir="ltr">{diag.ownerEmail ?? "אין מידע"}</span>. מנו את הסוכן כבעלים דרך
                    &quot;הוספת סוכן&quot; בטאב המשתמשים.
                  </span>
                </p>
              )}

              {diag && <SiteNotifyRow diag={diag} onSaved={() => void diagnostics.refetch()} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * ערוצי ההתראות של דף: מייל ווואטסאפ שאליהם נשלחות התראות על לידים
 * והתאמות, עם הודעת בדיקה שמראה מיד מה עובד ומה לא.
 */
function SiteNotifyRow({ diag, onSaved }: { diag: SiteDiagnostics[number]; onSaved: () => void }) {
  const updateNotify = useServerFn(adminUpdateSiteNotify);
  const sendTest = useServerFn(adminSendTestNotification);
  const [email, setEmail] = useState(diag.notify_email ?? "");
  const [whatsapp, setWhatsapp] = useState(diag.notify_whatsapp ?? "");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [test, setTest] = useState<{ email: string; whatsapp: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = email !== (diag.notify_email ?? "") || whatsapp !== (diag.notify_whatsapp ?? "");

  const save = async () => {
    setBusy("save");
    setErr(null);
    setMsg(null);
    try {
      await updateNotify({
        data: {
          siteId: diag.id,
          notifyEmail: email.trim() || null,
          notifyWhatsapp: whatsapp.trim() || null,
        },
      });
      setMsg("ערוצי ההתראות נשמרו");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy("test");
    setErr(null);
    setTest(null);
    try {
      setTest(await sendTest({ data: { siteId: diag.id } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שליחת הבדיקה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  const resultClass = (r: string) =>
    r.startsWith("נשלח")
      ? "text-whatsapp"
      : r.startsWith("נכשל")
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="mt-2 rounded-xl bg-secondary/40 p-2.5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-48 flex-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">מייל להתראות</span>
          <input
            className="field !py-1.5 text-sm"
            dir="ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@example.com"
          />
        </label>
        <label className="block min-w-40 flex-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            וואטסאפ להתראות
          </span>
          <input
            className="field !py-1.5 text-sm"
            dir="ltr"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="05X-XXXXXXX"
          />
        </label>
        <button
          type="button"
          disabled={busy != null || !dirty}
          onClick={() => void save()}
          className="rounded-xl bg-sun px-3 py-2 text-xs font-bold text-sun-foreground disabled:opacity-50"
        >
          {busy === "save" ? "שומר…" : "שמירה"}
        </button>
        <button
          type="button"
          disabled={busy != null || dirty}
          title={dirty ? "שמרו קודם את הערוצים" : undefined}
          onClick={() => void runTest()}
          className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
        >
          <Send className="size-3.5" aria-hidden="true" />
          {busy === "test" ? "שולח…" : "שלח הודעת בדיקה"}
        </button>
      </div>
      {!diag.notify_email && !diag.notify_whatsapp && (
        <p className="mt-1.5 text-xs font-semibold text-orange-800">
          אין ערוץ התראות — הסוכן לא יקבל הודעה על לידים חדשים.
        </p>
      )}
      {msg && <p className="mt-1.5 text-xs font-semibold text-primary">{msg}</p>}
      {err && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-destructive">
          {err}
        </p>
      )}
      {test && (
        <ul className="mt-1.5 grid gap-0.5 text-xs">
          <li className={`font-semibold ${resultClass(test.email)}`}>מייל: {test.email}</li>
          <li className={`font-semibold ${resultClass(test.whatsapp)}`}>
            וואטסאפ: {test.whatsapp}
          </li>
        </ul>
      )}
    </div>
  );
}
