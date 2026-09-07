import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Banknote, Users } from "lucide-react";
import { adminPipelineBoard } from "@/lib/crm.functions";
import { sumPipelineRows, type PipelineSiteRow } from "@/lib/crm";
import { LEAD_STATUSES } from "@/lib/leads";

/* ============================================================
 * לוח הפייפליין. סוכן רואה את הדף שלו, המנהל הראשי את כל הצוות —
 * אותה פונקציה במסד, אותם מספרים, בלי חישוב כפול בקליינט.
 *
 * המסך מפריד בכוונה בין "מצב עכשיו" (לידים פתוחים, משימות באיחור) שהוא
 * תמונת מצב חיה, לבין "תוצאה בטווח" (עסקאות, כסף, אובדן) שתלוי בתאריכים.
 * ============================================================ */

const RANGES: Array<{ key: string; label: string; days: number }> = [
  { key: "30", label: "30 יום", days: 30 },
  { key: "90", label: "רבעון", days: 90 },
  { key: "365", label: "שנה", days: 365 },
];

const fmtNum = (n: number) => n.toLocaleString("he-IL");
const fmtMoney = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("he-IL", { maximumFractionDigits: 1 })} מ׳ ₪`
    : `${n.toLocaleString("he-IL", { maximumFractionDigits: 0 })} ₪`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL", { dateStyle: "short" }) : "—";

/** העמודות של לוח הצוות. state = תמונת מצב, range = תוצאה בטווח התאריכים */
const COLUMNS: Array<{
  key: keyof PipelineSiteRow;
  label: string;
  scope: "state" | "range";
  danger?: boolean;
  money?: boolean;
}> = [
  { key: "openLeads", label: "לידים פתוחים", scope: "state" },
  { key: "untouched", label: "חדשים שלא טופלו", scope: "state", danger: true },
  { key: "overdueTasks", label: "משימות באיחור", scope: "state", danger: true },
  { key: "dueToday", label: "משימות להיום", scope: "state" },
  { key: "stale", label: "שקטים 14 יום", scope: "state", danger: true },
  { key: "tours", label: "סיורים", scope: "state" },
  { key: "negotiation", label: 'מו"מ', scope: "state" },
  { key: "deals", label: "עסקאות בטווח", scope: "range" },
  { key: "dealValue", label: "ערך העסקאות", scope: "range", money: true },
  { key: "lost", label: "נסגרו ללא עסקה", scope: "range" },
];

export default function AdminPipeline({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const fetchBoard = useServerFn(adminPipelineBoard);
  const [rangeKey, setRangeKey] = useState("90");

  const range = useMemo(() => {
    const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 90;
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600_000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [rangeKey]);

  const board = useQuery({
    queryKey: ["admin-pipeline-board", range.from, range.to],
    queryFn: () => fetchBoard({ data: range }),
  });

  const rows = board.data?.perSite ?? [];
  const totals = useMemo(() => sumPipelineRows(rows), [rows]);
  const byStatus = board.data?.byStatus ?? [];
  const lostReasons = board.data?.lostReasons ?? [];
  const closedDeals = board.data?.closedDeals ?? [];

  const statusCount = (status: string) => byStatus.find((s) => s.status === status)?.count ?? 0;
  const pipelineTotal = byStatus.reduce((n, s) => n + s.count, 0);

  return (
    <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted-foreground">טווח לתוצאות:</span>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRangeKey(r.key)}
            className={
              rangeKey === r.key
                ? "rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground"
                : "rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      {board.isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}
      {board.isError && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          טעינת הלוח נכשלה. רעננו את הדף.
        </p>
      )}

      {board.data && (
        <>
          {/* כותרות המצב — מה דורש טיפול עכשיו ומה נסגר בטווח */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["לידים פתוחים", totals.openLeads, false],
                ["משימות באיחור", totals.overdueTasks, totals.overdueTasks > 0],
                ["עסקאות בטווח", totals.deals, false],
                ["ערך העסקאות", totals.dealValue, false, true],
              ] as Array<[string, number, boolean, boolean?]>
            ).map(([label, value, danger, money]) => (
              <div
                key={label}
                className={`rounded-xl border p-3 text-center ${danger ? "border-destructive/60 bg-destructive/5" : "border-border"}`}
              >
                <p
                  className={`text-2xl font-extrabold ${danger ? "text-destructive" : "text-primary"}`}
                >
                  {money ? fmtMoney(value) : fmtNum(value)}
                </p>
                <p className="text-xs font-bold text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* הפייפליין לפי שלב */}
          <section className="rounded-xl border border-border p-3">
            <h3 className="text-sm font-extrabold text-primary">הפייפליין לפי שלב</h3>
            {pipelineTotal === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">אין לידים להצגה.</p>
            ) : (
              <ul className="mt-2 grid gap-1.5">
                {LEAD_STATUSES.filter((s) => statusCount(s) > 0).map((s) => {
                  const count = statusCount(s);
                  const pct = Math.round((count / pipelineTotal) * 100);
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-xs font-bold text-primary">{s}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span
                          className="block h-full rounded-full bg-sun"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-end text-xs font-bold text-muted-foreground">
                        {fmtNum(count)} ({pct}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* לוח הצוות — שורה לכל סוכן */}
          {rows.length > 0 && (
            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <Users className="size-4 text-sun" aria-hidden="true" />
                {isSuperAdmin ? "לוח הצוות" : "הדפים שלי"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                העמודות הראשונות הן תמונת מצב עכשיו; העסקאות והאובדן הם בטווח שנבחר.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-muted-foreground">
                      <th className="p-2 text-start">סוכן</th>
                      {COLUMNS.map((c) => (
                        <th key={String(c.key)} className="p-2 text-center">
                          {c.label}
                        </th>
                      ))}
                      <th className="p-2 text-center">פעילות אחרונה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.siteId} className="border-t border-border">
                        <td className="p-2 font-bold text-primary">{row.name}</td>
                        {COLUMNS.map((c) => {
                          const value = Number(row[c.key] ?? 0);
                          const alert = Boolean(c.danger) && value > 0;
                          return (
                            <td
                              key={String(c.key)}
                              className={`p-2 text-center ${alert ? "font-bold text-destructive" : "text-primary"}`}
                            >
                              {c.money ? fmtMoney(value) : fmtNum(value)}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center text-xs text-muted-foreground">
                          {fmtDate(row.lastActivityAt)}
                        </td>
                      </tr>
                    ))}
                    {rows.length > 1 && (
                      <tr className="border-t-2 border-primary/30 bg-secondary/40">
                        <td className="p-2 font-extrabold text-primary">סך הכול</td>
                        {COLUMNS.map((c) => {
                          const value = Number(totals[c.key as keyof typeof totals] ?? 0);
                          return (
                            <td
                              key={String(c.key)}
                              className="p-2 text-center font-extrabold text-primary"
                            >
                              {c.money ? fmtMoney(value) : fmtNum(value)}
                            </td>
                          );
                        })}
                        <td className="p-2" />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* למה מפסידים לידים */}
            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <AlertTriangle className="size-4 text-sun" aria-hidden="true" />
                סיבות אובדן
              </h3>
              {lostReasons.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  לא נסגרו לידים ללא עסקה בטווח הזה. סיבת האובדן נבחרת בכרטיס הליד כשמסמנים אותו "לא
                  רלוונטי".
                </p>
              ) : (
                <ul className="mt-2 grid gap-1">
                  {lostReasons.map((r) => (
                    <li key={r.reason} className="flex justify-between text-sm">
                      <span className="text-primary">{r.reason}</span>
                      <span className="font-bold text-muted-foreground">{fmtNum(r.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* העסקאות שנסגרו */}
            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <Banknote className="size-4 text-sun" aria-hidden="true" />
                עסקאות שנסגרו בטווח
              </h3>
              {closedDeals.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  אין עסקאות בטווח הזה. עסקה נספרת כשהליד עובר לסטטוס "נסגרה עסקה".
                </p>
              ) : (
                <ul className="mt-2 grid gap-1">
                  {closedDeals.slice(0, 12).map((d) => (
                    <li key={d.leadId} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-primary">
                        {d.name}
                        {isSuperAdmin && (
                          <span className="text-muted-foreground"> · {d.siteName}</span>
                        )}
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {d.dealValue ? fmtMoney(Number(d.dealValue)) : "ללא ערך"} ·{" "}
                        {fmtDate(d.closedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {closedDeals.some((d) => !d.dealValue) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  לעסקאות בלי ערך: מלאו "ערך עסקה" בכרטיס הליד כדי שהסכומים כאן יהיו מלאים.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
