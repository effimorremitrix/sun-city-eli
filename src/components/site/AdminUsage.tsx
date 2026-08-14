import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { adminAiUsage, type UsageReport } from "@/lib/ai-usage.functions";

const RANGES: Array<[string, string]> = [
  ["7d", "7 ימים"],
  ["30d", "30 ימים"],
  ["month", "החודש הנוכחי"],
];

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const num = (n: number) => n.toLocaleString("he-IL");
const dayLabel = (d: string) => d.slice(5).split("-").reverse().join("/");

export function AdminUsage() {
  const [range, setRange] = useState("30d");
  const fetchUsage = useServerFn(adminAiUsage);
  const { data, isLoading, error } = useQuery<UsageReport>({
    queryKey: ["ai-usage", range],
    queryFn: () => fetchUsage({ data: { range } }),
  });

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-primary">שימוש בסוכן ה‑AI (Usage)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            נתוני צריכה אמיתיים של חיפוש הנכסים החכם, מחויבים למפתח Anthropic של בעל האתר.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="בחירת תקופה">
          {RANGES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={range === key}
              onClick={() => setRange(key)}
              className={
                range === key
                  ? "rounded-xl bg-sun px-3 py-1.5 text-sm font-bold text-sun-foreground"
                  : "rounded-xl border border-primary/30 px-3 py-1.5 text-sm font-bold text-primary"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען נתוני שימוש…</p>}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          טעינת נתוני השימוש נכשלה
        </p>
      )}

      {data && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {(
              [
                ["בקשות", num(data.totals.requests)],
                ["טוקנים נכנסים", num(data.totals.input_tokens)],
                ["טוקנים יוצאים", num(data.totals.output_tokens)],
                ["עלות מוערכת", usd(data.totals.cost_usd)],
                ["שגיאות", num(data.totals.errors)],
              ] as Array<[string, string]>
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-primary/15 bg-background p-4">
                <p className="text-xs font-bold text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-extrabold text-primary" dir="ltr">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.days.map((d) => ({ ...d, label: dayLabel(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} orientation="right" />
                <Tooltip
                  formatter={(v: number, name: string) => [num(Number(v)), name]}
                  labelFormatter={(l) => `תאריך ${l}`}
                />
                <Legend />
                <Bar dataKey="input_tokens" name="טוקנים נכנסים" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="output_tokens" name="טוקנים יוצאים" fill="hsl(var(--sun))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="mt-8 text-base font-extrabold text-primary">פירוט לפי מודל</h3>
          {data.models.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">אין מידע</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="p-2 font-bold">מודל</th>
                    <th className="p-2 font-bold">בקשות</th>
                    <th className="p-2 font-bold">נכנסים</th>
                    <th className="p-2 font-bold">יוצאים</th>
                    <th className="p-2 font-bold">עלות</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((m) => (
                    <tr key={m.model} className="border-t border-primary/10">
                      <td className="p-2 font-semibold" dir="ltr">
                        {m.model}
                      </td>
                      <td className="p-2">{num(m.requests)}</td>
                      <td className="p-2">{num(m.input_tokens)}</td>
                      <td className="p-2">{num(m.output_tokens)}</td>
                      <td className="p-2" dir="ltr">
                        {usd(m.cost_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mt-8 text-base font-extrabold text-primary">50 הקריאות האחרונות</h3>
          {data.recent.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">אין מידע</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="p-2 font-bold">תאריך</th>
                    <th className="p-2 font-bold">מודל</th>
                    <th className="p-2 font-bold">טוקנים</th>
                    <th className="p-2 font-bold">עלות</th>
                    <th className="p-2 font-bold">סטטוס</th>
                    <th className="p-2 font-bold">משתמש</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((e) => (
                    <tr key={e.id} className="border-t border-primary/10">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-2" dir="ltr">
                        {e.model}
                      </td>
                      <td className="p-2" dir="ltr">
                        {num(e.input_tokens)} / {num(e.output_tokens)}
                      </td>
                      <td className="p-2" dir="ltr">
                        {usd(e.cost_usd)}
                      </td>
                      <td className="p-2">
                        {e.status === "success" ? (
                          <span className="font-semibold text-primary">הצלחה</span>
                        ) : (
                          <span className="font-semibold text-destructive">{e.error_message ?? "שגיאה"}</span>
                        )}
                      </td>
                      <td className="p-2">{e.user_email ?? "אורח"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-5 rounded-xl bg-secondary p-3 text-xs font-semibold text-primary">
            העלות המוצגת היא הערכה לפי תעריפי המודל בזמן החישוב. החיוב הרשמי והמדויק מופיע בקונסולת Anthropic
            (Usage &amp; Billing) של החשבון שממן את המפתח.
          </p>
        </>
      )}
    </section>
  );
}

export default AdminUsage;
