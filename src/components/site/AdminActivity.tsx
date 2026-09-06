import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  Bot,
  Cog,
  ListChecks,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { adminListActivity, type ActivityRow } from "@/lib/system.functions";
import type { ManagedSite } from "@/lib/admin.server";
import {
  ACTIVITY_STATUS_LABELS,
  ContactCardSection,
  activityStatusClass,
} from "@/components/site/AdminLeadDrawer";

/* ============================================================
 * יומן הפעילות — כל מה שהמערכת עשתה: פניות לקוחות, פעולות סוכנים
 * ומנהל, התראות שנשלחו (או נכשלו), שימוש ב-AI, משימות מתוזמנות,
 * אירועי מערכת ואבטחה. סוכן רואה רק את הדף שלו (RLS).
 * ============================================================ */

const KINDS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: "client", label: "לקוח", icon: Users },
  { key: "agent", label: "סוכן", icon: UserRound },
  { key: "admin", label: "מנהל", icon: ShieldCheck },
  { key: "notification", label: "התראה", icon: Bell },
  { key: "ai", label: "AI", icon: Bot },
  { key: "job", label: "משימה", icon: Cog },
  { key: "system", label: "מערכת", icon: Server },
  { key: "security", label: "אבטחה", icon: Lock },
];

const kindMeta = (kind: string) =>
  KINDS.find((k) => k.key === kind) ?? { key: kind, label: kind, icon: ListChecks };

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

const PAGE = 100;

type Filters = { siteId: string | null; kind: string | null; onlyFailed: boolean; q: string };

export default function AdminActivity({
  sites,
  isSuperAdmin,
  selectedSiteId,
}: {
  sites: ManagedSite[];
  isSuperAdmin: boolean;
  selectedSiteId: string | null;
}) {
  const listActivity = useServerFn(adminListActivity);

  // מנהל ראשי מתחיל מ"כל הדפים"; סוכן תמיד בהיקף הדף שלו (השרת אוכף)
  const [filters, setFilters] = useState<Filters>({
    siteId: isSuperAdmin ? null : selectedSiteId,
    kind: null,
    onlyFailed: false,
    q: "",
  });
  const [qInput, setQInput] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);

  const first = useQuery({
    queryKey: ["admin-activity", filters],
    queryFn: () =>
      listActivity({
        data: {
          siteId: filters.siteId,
          kind: filters.kind,
          onlyFailed: filters.onlyFailed,
          q: filters.q || null,
          limit: PAGE,
        },
      }),
  });

  // עמודים נוספים ("טען עוד") — מאופסים כשהפילטרים משתנים
  const filtersKey = JSON.stringify(filters);
  const [more, setMore] = useState<{ key: string; rows: ActivityRow[]; done: boolean }>({
    key: filtersKey,
    rows: [],
    done: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreErr, setMoreErr] = useState<string | null>(null);
  const extra = more.key === filtersKey ? more.rows : [];
  const done = more.key === filtersKey ? more.done : false;
  const rows = [...(first.data ?? []), ...extra];
  const canLoadMore = !done && rows.length > 0 && (first.data?.length ?? 0) >= PAGE;

  const loadMore = async () => {
    const last = rows[rows.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setMoreErr(null);
    try {
      const next = await listActivity({
        data: {
          siteId: filters.siteId,
          kind: filters.kind,
          onlyFailed: filters.onlyFailed,
          q: filters.q || null,
          limit: PAGE,
          before: last.created_at,
        },
      });
      setMore({ key: filtersKey, rows: [...extra, ...next], done: next.length < PAGE });
    } catch (e) {
      setMoreErr(e instanceof Error ? e.message : "הטעינה נכשלה");
    } finally {
      setLoadingMore(false);
    }
  };

  const siteName = (id: string | null) =>
    id ? (sites.find((s) => s.id === id)?.name ?? null) : null;

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <ListChecks className="size-5 text-sun" aria-hidden="true" />
          יומן פעילות
        </h2>
        <button
          type="button"
          onClick={() => void first.refetch()}
          className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          רענון
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        כל פעולה של המערכת נרשמת כאן: פניות, התראות שנשלחו או נכשלו, סריקות, שימוש ב-AI וחסימות.
        כשלקוח אומר "לא קיבלתי הודעה" — מחפשים כאן. פרטי הנמענים מוסתרים חלקית.
      </p>

      {/* פילטרים */}
      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...filters, q: qInput.trim() });
        }}
      >
        {isSuperAdmin && sites.length > 1 && (
          <select
            className="field max-w-52"
            value={filters.siteId ?? ""}
            onChange={(e) => setFilters({ ...filters, siteId: e.target.value || null })}
            aria-label="דף / סוכן"
          >
            <option value="">כל הדפים</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="field max-w-40"
          value={filters.kind ?? ""}
          onChange={(e) => setFilters({ ...filters, kind: e.target.value || null })}
          aria-label="סוג"
        >
          <option value="">כל הסוגים</option>
          {KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={filters.onlyFailed}
            onChange={(e) => setFilters({ ...filters, onlyFailed: e.target.checked })}
          />
          רק כשלים
        </label>
        <input
          className="field max-w-60"
          placeholder="חיפוש חופשי בהודעה / אירוע / שגיאה"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
        >
          חיפוש
        </button>
      </form>

      {first.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען…</p>}
      {first.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת היומן נכשלה: {first.error instanceof Error ? first.error.message : ""}
        </p>
      )}
      {!first.isLoading && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">אין רשומות שתואמות לסינון.</p>
      )}

      <ul className="mt-4 grid gap-1.5">
        {rows.map((r) => {
          const meta = kindMeta(r.kind);
          const Icon = meta.icon;
          const site = siteName(r.site_id);
          return (
            <li
              key={r.id}
              className={`rounded-xl border p-2.5 text-xs ${r.status === "failed" ? "border-destructive/40 bg-destructive/5" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0 text-muted-foreground" dir="ltr">
                  {fmtDateTime(r.created_at)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${activityStatusClass(r.status)}`}
                >
                  {ACTIVITY_STATUS_LABELS[r.status] ?? r.status}
                </span>
                <span
                  className="inline-flex shrink-0 items-center gap-1 font-bold text-primary"
                  title={r.event}
                >
                  <Icon className="size-3.5 text-sun" aria-hidden="true" />
                  {meta.label}
                </span>
                {site && isSuperAdmin && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                    {site}
                  </span>
                )}
                <span className="min-w-0 flex-1 text-foreground" dir="auto">
                  {r.message ?? r.event}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground">
                {r.channel && (
                  <span>
                    ערוץ: {r.channel}
                    {r.recipient ? (
                      <>
                        {" · "}
                        <span dir="ltr">{r.recipient}</span>
                      </>
                    ) : null}
                  </span>
                )}
                {r.contact_id && (
                  <button
                    type="button"
                    onClick={() => setContactId(r.contact_id)}
                    className="font-bold text-primary underline"
                  >
                    כרטיס הלקוח
                  </button>
                )}
                {r.listing_id && (
                  <a
                    href={`/?listing=${r.listing_id}#properties`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary underline"
                  >
                    הנכס
                  </a>
                )}
                {r.market_listing_id && (
                  <a
                    href={`/?market=${r.market_listing_id}#properties`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary underline"
                  >
                    מודעת שוק
                  </a>
                )}
                <span className="text-[11px] opacity-70" dir="ltr">
                  {r.event}
                </span>
              </div>
              {r.error && (
                <p className="mt-1 break-words font-semibold text-destructive" dir="auto">
                  {r.error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {moreErr && (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {moreErr}
        </p>
      )}
      {canLoadMore && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          className="mt-3 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary disabled:opacity-60"
        >
          {loadingMore ? "טוען…" : "טען עוד"}
        </button>
      )}

      {/* כרטיס לקוח — חלונית */}
      {contactId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="כרטיס הלקוח"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[oklch(0.263_0.038_260/0.6)] p-0 sm:items-center sm:p-4"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                <UserRound className="size-5 text-sun" aria-hidden="true" />
                כרטיס הלקוח
              </h3>
              <button
                type="button"
                onClick={() => setContactId(null)}
                aria-label="סגירה"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-primary"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4">
              <ContactCardSection contactId={contactId} sites={sites} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
