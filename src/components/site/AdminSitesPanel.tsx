import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Home, Link2, Power } from "lucide-react";
import {
  adminGetHomeRedirect,
  adminSetHomeRedirect,
  adminSetSiteActive,
} from "@/lib/users.functions";
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
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-primary">{s.name}</span>{" "}
                <span dir="ltr" className="text-xs text-muted-foreground">
                  /{isOffice ? "" : s.slug}
                </span>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
