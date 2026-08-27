import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3 } from "lucide-react";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/lib/analytics.functions";

/* ============================================================
 * דשבורד סטטיסטיקות — כניסות לאתר, מקורות תנועה, נכסים נצפים
 * והשוואת סוכנים. הנתונים מהמדידה העצמית (page_views / track_events).
 * ============================================================ */

type RangeKey = "today" | "7d" | "30d" | "custom";

const fmt = (n: number) => n.toLocaleString("he-IL");

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

export default function AdminAnalytics() {
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = useMemo(
    () => rangeFor(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const summary = useQuery({
    queryKey: ["analytics", from.toISOString(), to.toISOString()],
    queryFn: () =>
      fetchSummary({
        data: { from: from.toISOString(), to: to.toISOString() },
      }) as Promise<AnalyticsSummary>,
  });

  const s = summary.data;
  const maxDay = Math.max(1, ...(s?.perDay ?? []).map((d) => d.views));
  const maxSource = Math.max(1, ...(s?.sources ?? []).map((x) => x.views));

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

          {/* השוואת סוכנים */}
          <div className="mt-5">
            <h3 className="text-sm font-extrabold text-primary">לפי סוכן / דף</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[44rem] text-xs">
                <thead>
                  <tr className="border-b border-border text-start font-bold text-muted-foreground">
                    {[
                      "דף",
                      "צפיות",
                      "מבקרים",
                      "צפיות נכס",
                      "וואטסאפ",
                      "טלפון",
                      "שליחות טופס",
                      "לידים",
                      "הרשמות",
                    ].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-start">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.perSite.map((row) => (
                    <tr key={row.siteId} className="border-b border-border/60">
                      <td className="px-2 py-1.5 font-bold text-primary">
                        {row.name} <span className="text-muted-foreground">/{row.slug}</span>
                      </td>
                      <td className="px-2 py-1.5">{fmt(row.views)}</td>
                      <td className="px-2 py-1.5">{fmt(row.sessions)}</td>
                      <td className="px-2 py-1.5">{fmt(row.propertyViews)}</td>
                      <td className="px-2 py-1.5">{fmt(row.whatsappClicks)}</td>
                      <td className="px-2 py-1.5">{fmt(row.phoneClicks)}</td>
                      <td className="px-2 py-1.5">{fmt(row.leadSubmits)}</td>
                      <td className="px-2 py-1.5">{fmt(row.leads)}</td>
                      <td className="px-2 py-1.5">{fmt(row.signups)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              צפיית עמוד נרשמת לדף שבו ביקר הגולש; "לידים" נספרים מטבלת הלידים עצמה.
            </p>
          </div>

          {/* נכסים נצפים */}
          {s.topListings.length > 0 && (
            <div className="mt-5">
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
          )}
        </>
      )}
    </section>
  );
}
