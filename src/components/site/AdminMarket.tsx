import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Play, RefreshCw, Store } from "lucide-react";
import { adminListMarketListings, adminSetMarketListingHidden } from "@/lib/market.functions";
import { adminRunJob } from "@/lib/system.functions";
import { formatListingPrice } from "@/lib/listings";

/* ============================================================
 * מאגר השוק (מנהל ראשי): המודעות שנאספו מהשוק, הסתרה/חשיפה, ומשימות
 * הסריקה (שכונה + סוג עסקה) עם מצב הריצה האחרונה.
 * ============================================================ */

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
    : "אין מידע";

export default function AdminMarket() {
  const listMarket = useServerFn(adminListMarketListings);
  const setHidden = useServerFn(adminSetMarketListingHidden);
  const runJob = useServerFn(adminRunJob);

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const market = useQuery({
    queryKey: ["admin-market", search, onlyActive],
    queryFn: () => listMarket({ data: { q: search || null, onlyActive } }),
  });

  const toggleHidden = async (id: string, hidden: boolean) => {
    setBusyId(id);
    setErr(null);
    try {
      await setHidden({ data: { id, hidden } });
      await market.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  const scanNow = async () => {
    setScanBusy(true);
    setScanMsg(null);
    setErr(null);
    try {
      const r = await runJob({ data: { job: "market-scan" } });
      let summary: Record<string, unknown> = {};
      try {
        summary = JSON.parse(r.summary) as Record<string, unknown>;
      } catch {
        /* סיכום לא תקין — מציגים רק סטטוס */
      }
      const nums = Object.entries(summary)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(" · ");
      setScanMsg(
        r.ok ? `הסריקה הסתיימה${nums ? ` — ${nums}` : ""}` : `הסריקה נכשלה: ${r.error ?? "שגיאה"}`,
      );
      await market.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הסריקה נכשלה");
    } finally {
      setScanBusy(false);
    }
  };

  const listings = market.data?.listings ?? [];
  const tasks = market.data?.tasks ?? [];

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Store className="size-5 text-sun" aria-hidden="true" />
          מאגר השוק
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={market.isFetching}
            onClick={() => void market.refetch()}
            className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-60"
          >
            <RefreshCw
              className={`size-3.5 ${market.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            רענון
          </button>
          <button
            type="button"
            disabled={scanBusy}
            onClick={() => void scanNow()}
            className="inline-flex items-center gap-1 rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-60"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {scanBusy ? "סורק…" : "הרץ סריקה עכשיו"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        מודעות מהשוק שנאספו לפי הביקוש של הלקוחות, ומוצגות באתר לצד נכסי המשרד. מודעה מוסתרת לא
        מופיעה לגולשים ולא נשלחת בהתראות. הסריקה רצה אוטומטית לפי המתזמן; כאן אפשר להריץ אותה מיד.
      </p>

      {scanMsg && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">
          {scanMsg}
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

      {/* חיפוש וסינון */}
      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <input
          className="field max-w-64"
          placeholder="חיפוש בכותרת המודעה"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
        >
          חיפוש
        </button>
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          רק מודעות פעילות
        </label>
        <span className="text-xs text-muted-foreground">{listings.length} מודעות</span>
      </form>

      {market.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען…</p>}
      {market.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת המאגר נכשלה: {market.error instanceof Error ? market.error.message : ""}
        </p>
      )}

      {/* טבלת המודעות */}
      {!market.isLoading && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-xs">
            <thead>
              <tr className="border-b border-border font-bold text-muted-foreground">
                {[
                  "מקור",
                  "כותרת",
                  "עסקה",
                  "שכונה",
                  "מחיר",
                  "חדרים",
                  "נראה לראשונה",
                  "נראה לאחרונה",
                  "מצב",
                  "",
                ].map((h, i) => (
                  <th key={i} className="px-2 py-1.5 text-start">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map((m) => {
                const hidden = m.hidden_by_admin === true;
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-border/60 ${hidden ? "opacity-60" : ""}`}
                  >
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {m.source_site ?? m.source}
                    </td>
                    <td className="max-w-64 px-2 py-1.5">
                      <a
                        href={m.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-primary underline"
                        title={m.title}
                      >
                        <span className="truncate">{m.title}</span>
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                      </a>
                    </td>
                    <td className="px-2 py-1.5">{m.deal_type}</td>
                    <td className="px-2 py-1.5">{m.neighborhood ?? "אין מידע"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatListingPrice(m.price)}</td>
                    <td className="px-2 py-1.5">{m.rooms ?? "אין מידע"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(m.first_seen_at)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(m.last_seen_at)}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          hidden
                            ? "bg-orange-100 text-orange-700"
                            : m.is_active === false
                              ? "bg-muted text-muted-foreground"
                              : "bg-whatsapp/15 text-whatsapp"
                        }`}
                      >
                        {hidden ? "מוסתר" : m.is_active === false ? "לא פעיל" : "פעיל"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => void toggleHidden(m.id, !hidden)}
                        className="whitespace-nowrap rounded-xl border border-primary/30 px-2.5 py-1 font-bold text-primary disabled:opacity-50"
                      >
                        {busyId === m.id ? "מעדכן…" : hidden ? "חשיפה" : "הסתרה"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-2 py-3 text-muted-foreground">
                    אין מודעות במאגר. הריצו סריקה או בדקו שסריקת השוק פעילה בהגדרות.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* משימות סריקה */}
      <h3 className="mt-6 text-sm font-extrabold text-primary">משימות סריקה ({tasks.length})</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        כל משימה היא שילוב של סוג עסקה ושכונה; "ביקוש" = כמה פרופילי חיפוש פעילים רוצים אותה.
        המשימות עם הביקוש הגבוה ביותר נסרקות ראשונות בכל ריצה.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-xs">
          <thead>
            <tr className="border-b border-border font-bold text-muted-foreground">
              {["עסקה", "שכונה", "ביקוש", "סריקה אחרונה", "נמצאו", "שגיאה"].map((h) => (
                <th key={h} className="px-2 py-1.5 text-start">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.key} className="border-b border-border/60">
                <td className="px-2 py-1.5">{t.deal_type}</td>
                <td className="px-2 py-1.5 font-bold text-primary">{t.neighborhood}</td>
                <td className="px-2 py-1.5">{t.demand}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(t.last_scanned_at)}</td>
                <td className="px-2 py-1.5">{t.last_found ?? "אין מידע"}</td>
                <td
                  className="max-w-64 truncate px-2 py-1.5 text-destructive"
                  title={t.last_error ?? undefined}
                  dir="auto"
                >
                  {t.last_error ?? ""}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-3 text-muted-foreground">
                  אין משימות סריקה עדיין — הן נוצרות אוטומטית מפרופילי החיפוש של הלקוחות.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
