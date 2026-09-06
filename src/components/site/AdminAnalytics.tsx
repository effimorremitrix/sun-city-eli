import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Filter } from "lucide-react";
import {
  getAnalyticsFunnel,
  getAnalyticsSummary,
  type AnalyticsFunnel,
  type AnalyticsSummary,
} from "@/lib/analytics.functions";

/* ============================================================
 * דשבורד סטטיסטיקות — כניסות לאתר, מקורות תנועה, נכסים נצפים,
 * משפך המרות (כניסה → צפייה בנכס → פנייה → הרשמה → ליד → התעניינות → עסקה),
 * השוואת סוכנים ומקורות לידים. הנתונים מהמדידה העצמית (page_views /
 * track_events) ומטבלת הלידים.
 * ============================================================ */

type RangeKey = "today" | "7d" | "30d" | "custom";

const fmt = (n: number) => (n ?? 0).toLocaleString("he-IL");
/** אחוז מתוך בסיס; "—" כשאין בסיס */
const pct = (part: number, base: number) =>
  base > 0 ? `${Math.round((part / base) * 1000) / 10}%` : "—";

function rangeFor(key: RangeKey, customFrom: string, customTo: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (key === "today") from.setHours(0, 0, 0, 0);
  else if (key === "7d") from.setDate(from.getDate() - 7);
  else if (key === "30d") from.setDate(from.getDate() - 30);
  else {
    return {
      from: customFrom ? new Date(customFrom) : new Date(Date.now() - 30 * 24 * 3600 * 1000),
      to: customTo ? new Date(`${customTo}T23:59:59`) : to,
    };
  }
  return { from, to };
}

/** פס אופקי פשוט — בלי ספריית גרפים, מספיק להשוואה מהירה */
function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return <span className="inline-block h-2.5 rounded-full bg-sun" style={{ width: `${width}%` }} />;
}

/** טבלה קטנה וקריאה בנייד (גלילה אופקית פנימית) */
function MiniTable({
  headers,
  rows,
  minWidth = "24rem",
}: {
  headers: string[];
  rows: Array<{ key: string; cells: Array<string | number>; highlight?: boolean }>;
  minWidth?: string;
}) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border font-bold text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="px-2 py-1.5 text-start">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={`border-b border-border/60 ${r.highlight ? "bg-sun/10 font-bold" : ""}`}
            >
              {r.cells.map((c, i) => (
                <td key={i} className={`px-2 py-1.5 ${i === 0 ? "font-bold text-primary" : ""}`}>
                  {typeof c === "number" ? fmt(c) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FUNNEL_STEPS: Array<[keyof AnalyticsFunnel["funnel"], string]> = [
  ["visits", "כניסות (סשנים)"],
  ["propertyViews", "צפייה בנכס"],
  ["contacts", "פנייה (וואטסאפ / טלפון / טופס)"],
  ["signups", "הרשמה"],
  ["leads", "ליד"],
  ["interests", "התעניינות"],
  ["deals", "עסקה"],
];

export default function AdminAnalytics() {
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const fetchFunnel = useServerFn(getAnalyticsFunnel);
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = useMemo(
    () => rangeFor(range, customFrom, customTo),
    [range, customFrom, customTo],
  );
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const summary = useQuery({
    queryKey: ["analytics", fromIso, toIso],
    queryFn: () =>
      fetchSummary({ data: { from: fromIso, to: toIso } }) as Promise<AnalyticsSummary>,
  });
  const funnel = useQuery({
    queryKey: ["analytics-funnel", fromIso, toIso],
    queryFn: () => fetchFunnel({ data: { from: fromIso, to: toIso } }) as Promise<AnalyticsFunnel>,
  });

  const s = summary.data;
  const f = funnel.data;
  const maxDay = Math.max(1, ...(s?.perDay ?? []).map((d) => d.views));
  const maxSource = Math.max(1, ...(s?.sources ?? []).map((x) => x.views));

  /** לכל סוכן — ממוין לפי לידים; הסוכן עם יחס ההמרה הטוב ביותר (לידים/כניסות) מודגש */
  const perSite = useMemo(() => {
    const rows = [...(f?.perSite ?? [])].sort((a, b) => b.leads - a.leads);
    let best: string | null = null;
    let bestRate = 0;
    for (const r of rows) {
      if (r.visits > 0 && r.leads > 0) {
        const rate = r.leads / r.visits;
        if (rate > bestRate) {
          bestRate = rate;
          best = r.siteId;
        }
      }
    }
    return { rows, best };
  }, [f]);

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <BarChart3 className="size-5 text-sun" aria-hidden="true" />
        סטטיסטיקות כניסות ופעילות
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        מדידה עצמית ופרטית (בלי Google/Meta): כניסות, מקורות, נכסים נצפים ולחיצות — כלל האתר ולכל
        סוכן בנפרד. הנתונים נאספים מרגע העלייה של גרסה זו.
      </p>

      {/* בחירת טווח */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        {(
          [
            ["today", "היום"],
            ["7d", "7 ימים"],
            ["30d", "30 ימים"],
            ["custom", "טווח מותאם"],
          ] as Array<[RangeKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={
              range === key
                ? "rounded-xl bg-sun px-4 py-2 text-sun-foreground"
                : "rounded-xl border border-primary/30 px-4 py-2 text-primary"
            }
          >
            {label}
          </button>
        ))}
        {range === "custom" && (
          <span className="flex items-center gap-2">
            <input
              type="date"
              className="field !w-auto"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            –
            <input
              type="date"
              className="field !w-auto"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </span>
        )}
      </div>

      {summary.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען נתונים…</p>}
      {summary.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת הנתונים נכשלה
        </p>
      )}

      {s && (
        <>
          {/* מספרים ראשיים */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                [s.totals.views, "צפיות עמוד"],
                [s.totals.sessions, "מבקרים (סשנים)"],
                [s.totals.newSessions, "מבקרים חדשים"],
              ] as Array<[number, string]>
            ).map(([value, label]) => (
              <div key={label} className="rounded-xl border border-border p-3 text-center">
                <p className="text-2xl font-extrabold text-primary">{fmt(value)}</p>
                <p className="text-xs font-bold text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* צפיות לפי יום */}
          {s.perDay.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-primary">צפיות לפי יום</h3>
              <ul className="mt-2 grid gap-1 text-xs">
                {s.perDay.map((d) => (
                  <li key={d.day} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-muted-foreground" dir="ltr">
                      {d.day}
                    </span>
                    <span className="flex-1">
                      <Bar value={d.views} max={maxDay} />
                    </span>
                    <span className="w-10 shrink-0 text-end font-bold">{fmt(d.views)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* מקורות תנועה */}
          {s.sources.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-primary">מקורות כניסה</h3>
              <ul className="mt-2 grid gap-1 text-xs">
                {s.sources.map((src) => (
                  <li key={src.source} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-muted-foreground">
                      {src.source}
                    </span>
                    <span className="flex-1">
                      <Bar value={src.views} max={maxSource} />
                    </span>
                    <span className="w-10 shrink-0 text-end font-bold">{fmt(src.views)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ==================== משפך המרות ==================== */}
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-primary">
          <Filter className="size-4 text-sun" aria-hidden="true" />
          משפך המרות
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          המשפך סופר סשנים ייחודיים בשלבי הגלישה ורשומות בשלבי הליד; הנתונים מהמדידה העצמית מרגע
          העלייה של גרסה זו
        </p>
        {funnel.isLoading && <p className="mt-3 text-sm text-muted-foreground">טוען משפך…</p>}
        {funnel.isError && (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            טעינת המשפך נכשלה
          </p>
        )}
        {f && (
          <ul className="mt-3 grid gap-2 text-xs">
            {FUNNEL_STEPS.map(([key, label], i) => {
              const value = f.funnel[key] ?? 0;
              const prev = i > 0 ? (f.funnel[FUNNEL_STEPS[i - 1]![0]] ?? 0) : null;
              const max = Math.max(1, f.funnel.visits);
              return (
                <li key={key} className="grid grid-cols-[10rem_1fr_auto] items-center gap-2">
                  <span className="truncate font-bold text-primary">{label}</span>
                  <span className="min-w-0">
                    <Bar value={value} max={max} />
                  </span>
                  <span className="whitespace-nowrap text-end">
                    <span className="font-extrabold text-primary">{fmt(value)}</span>
                    {prev !== null && (
                      <span className="ms-1.5 text-muted-foreground">
                        ({pct(value, prev)} מהשלב הקודם)
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
            <li className="mt-1 text-[11px] text-muted-foreground">
              בקשות חזרה בטווח: {fmt(f.funnel.callbacks)} · המרה כוללת כניסה → ליד:{" "}
              <span className="font-bold text-primary">{pct(f.funnel.leads, f.funnel.visits)}</span>
            </li>
          </ul>
        )}
      </div>

      {/* ==================== לכל סוכן ==================== */}
      {f && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-primary">לכל סוכן / דף</h3>
          <MiniTable
            minWidth="64rem"
            headers={[
              "דף",
              "כניסות",
              "צפיות בנכסים",
              "וואטסאפ",
              "טלפון",
              "חיפושים חכמים",
              "הרשמות",
              "לידים",
              "התעניינויות",
              "בקשות חזרה",
              "עסקאות",
              "לידים פתוחים",
              "המרה (לידים/כניסות)",
            ]}
            rows={perSite.rows.map((r) => ({
              key: r.siteId,
              highlight: r.siteId === perSite.best,
              cells: [
                `${r.name} /${r.slug}${r.siteId === perSite.best ? " ★" : ""}`,
                r.visits,
                r.propertyViews,
                r.whatsappClicks,
                r.phoneClicks,
                r.aiSearches,
                r.signups,
                r.leads,
                r.interests,
                r.callbacks,
                r.deals,
                r.openLeads,
                pct(r.leads, r.visits),
              ],
            }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            ממוין לפי לידים; ★ = הסוכן עם יחס ההמרה הטוב ביותר (לידים מתוך כניסות). "לידים פתוחים" —
            לידים שעדיין לא נסגרו, ללא תלות בטווח התאריכים.
          </p>
        </div>
      )}

      {/* ==================== מקורות לידים ==================== */}
      {f && f.leadSources.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-primary">מקורות לידים</h3>
          <MiniTable
            headers={["מקור", "לידים", "התעניינויות", "עסקאות", "המרה לעסקה"]}
            rows={f.leadSources.map((r) => ({
              key: r.source,
              cells: [r.source || "לא ידוע", r.leads, r.interests, r.deals, pct(r.deals, r.leads)],
            }))}
          />
        </div>
      )}

      {/* ==================== ערוצים ==================== */}
      {f && f.leadChannels.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-primary">ערוצים (איך הליד הגיע)</h3>
          <MiniTable
            minWidth="16rem"
            headers={["ערוץ", "לידים"]}
            rows={f.leadChannels.map((r) => ({
              key: r.source,
              cells: [r.source || "לא ידוע", r.leads],
            }))}
          />
        </div>
      )}

      {/* ==================== קמפיינים ==================== */}
      {f && f.campaigns.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-primary">קמפיינים</h3>
          <MiniTable
            headers={["קמפיין", "לידים", "עסקאות", "המרה לעסקה"]}
            rows={f.campaigns.map((r) => ({
              key: r.campaign,
              cells: [r.campaign || "ללא קמפיין", r.leads, r.deals, pct(r.deals, r.leads)],
            }))}
          />
        </div>
      )}

      {/* ==================== מגע ראשון ==================== */}
      {f && f.firstTouchSites.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-primary">מגע ראשון לפי דף סוכן</h3>
          <MiniTable
            minWidth="16rem"
            headers={["דף", "אנשי קשר"]}
            rows={f.firstTouchSites.map((r) => ({
              key: r.siteId,
              cells: [r.name, r.contacts],
            }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            הדף שבו איש הקשר נפגש עם SUN CITY בפעם הראשונה — גם אם אחר כך פנה דרך דף אחר.
          </p>
        </div>
      )}

      {/* ==================== נכסים נצפים ==================== */}
      {(f?.topListings.length ?? 0) > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-primary">הנכסים הנצפים ביותר</h3>
          <MiniTable
            minWidth="20rem"
            headers={["#", "נכס", "צפיות", "לידים"]}
            rows={(f?.topListings ?? []).map((l, i) => ({
              key: l.listingId,
              cells: [String(i + 1), l.title, l.views, l.leads],
            }))}
          />
        </div>
      ) : (
        s &&
        s.topListings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-extrabold text-primary">הנכסים הנצפים ביותר</h3>
            <ol className="mt-2 grid gap-1 text-xs">
              {s.topListings.map((l, i) => (
                <li key={l.listingId} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 font-bold text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1 truncate font-semibold">{l.title}</span>
                  <span className="shrink-0 font-bold">{fmt(l.views)}</span>
                </li>
              ))}
            </ol>
          </div>
        )
      )}
    </section>
  );
}
