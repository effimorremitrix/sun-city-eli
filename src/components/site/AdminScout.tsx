import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListScoutProfiles,
  adminSaveScoutProfile,
  adminDeleteScoutProfile,
  adminListScoutCandidates,
  adminRunScout,
  adminSetCandidateStatus,
  adminApproveCandidate,
  type ScoutProfileRow,
  type ScoutCandidateRow,
} from "@/lib/scout.functions";
import { neighborhoods } from "@/lib/site-data";

const SOURCES: Array<[string, string]> = [
  ["yad2", "יד2"],
  ["madlan", "מדלן"],
  ["homeless", "הומלס"],
  ["komo", "קומו"],
  ["winwin", "וין וין"],
  // מיטב-המאמץ: פייסבוק/אינסטגרם חסמו את ה-API לקבוצות, לכן נמצאים
  // רק פוסטים ציבוריים שמאונדקסים במנועי החיפוש (מיעוט קטן מהקבוצות)
  ["facebook", "פייסבוק (קבוצות ציבוריות)"],
  ["instagram", "אינסטגרם (פוסטים ציבוריים)"],
];

const STATUSES: Array<[string, string]> = [
  ["new", "מועמדים חדשים"],
  ["approved", "אושרו"],
  ["rejected", "נדחו"],
];

type Form = {
  id?: string | null;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  min_price: string;
  max_price: string;
  min_rooms: string;
  min_size: string;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  sources: string[];
  notes: string;
  is_active: boolean;
};

const emptyForm: Form = {
  label: "סריקת נכסים בנתניה",
  deal_type: "מכירה",
  city: "נתניה",
  neighborhoods: [],
  min_price: "",
  max_price: "",
  min_rooms: "",
  min_size: "",
  needs_mamad: false,
  needs_elevator: false,
  needs_parking: false,
  needs_balcony: false,
  sources: ["yad2", "madlan"],
  notes: "",
  is_active: true,
};

const toForm = (p: ScoutProfileRow): Form => ({
  id: p.id,
  label: p.label,
  deal_type: p.deal_type,
  city: p.city,
  neighborhoods: p.neighborhoods ?? [],
  min_price: p.min_price == null ? "" : String(p.min_price),
  max_price: p.max_price == null ? "" : String(p.max_price),
  min_rooms: p.min_rooms == null ? "" : String(p.min_rooms),
  min_size: p.min_size == null ? "" : String(p.min_size),
  needs_mamad: p.needs_mamad,
  needs_elevator: p.needs_elevator,
  needs_parking: p.needs_parking,
  needs_balcony: p.needs_balcony,
  sources: p.sources ?? [],
  notes: p.notes ?? "",
  is_active: p.is_active,
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const nis = (n: number | null) => (n == null ? "אין מידע" : `${n.toLocaleString("he-IL")} ₪`);
const val = (n: number | null, suffix = "") => (n == null ? "אין מידע" : `${n}${suffix}`);

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

export function AdminScout() {
  const qc = useQueryClient();
  const listProfiles = useServerFn(adminListScoutProfiles);
  const saveProfile = useServerFn(adminSaveScoutProfile);
  const deleteProfile = useServerFn(adminDeleteScoutProfile);
  const listCandidates = useServerFn(adminListScoutCandidates);
  const runScout = useServerFn(adminRunScout);
  const setStatus = useServerFn(adminSetCandidateStatus);
  const approve = useServerFn(adminApproveCandidate);

  const [form, setForm] = useState<Form>(emptyForm);
  const [status, setStatusTab] = useState("new");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const profiles = useQuery({ queryKey: ["scout-profiles"], queryFn: () => listProfiles() });
  const candidates = useQuery({
    queryKey: ["scout-candidates", status],
    queryFn: () => listCandidates({ data: { status } }),
  });

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      await qc.invalidateQueries({ queryKey: ["scout-profiles"] });
      await qc.invalidateQueries({ queryKey: ["scout-candidates"] });
      await qc.invalidateQueries({ queryKey: ["scout-new-count"] });
      await qc.invalidateQueries({ queryKey: ["admin-listings"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(
      () =>
        saveProfile({
          data: {
            id: form.id ?? null,
            label: form.label,
            deal_type: form.deal_type,
            city: form.city,
            neighborhoods: form.neighborhoods,
            min_price: num(form.min_price),
            max_price: num(form.max_price),
            min_rooms: num(form.min_rooms),
            min_size: num(form.min_size),
            needs_mamad: form.needs_mamad,
            needs_elevator: form.needs_elevator,
            needs_parking: form.needs_parking,
            needs_balcony: form.needs_balcony,
            sources: form.sources,
            notes: form.notes.trim() === "" ? null : form.notes,
            is_active: form.is_active,
          },
        }),
      "קריטריוני הסריקה נשמרו",
    ).then(() => setForm(emptyForm));

  const doRun = (profileId?: string) =>
    run(async () => {
      const r = (await runScout({ data: { profileId: profileId ?? null } })) as {
        scanned: number;
        found: number;
        inserted: number;
        errors: string[];
      };
      if (r.errors?.length) throw new Error(r.errors.join(" | "));
      setStatusTab("new");
      return r;
    }, "הסריקה הושלמה — בדקו את רשימת המועמדים");

  const input = "mt-1 w-full rounded-xl border border-primary/25 bg-background px-3 py-2 text-sm";
  const label = "text-xs font-bold text-primary";

  return (
    <div className="mt-6 space-y-6">
      <section className="soft-card p-5">
        <h2 className="text-lg font-extrabold text-primary">סוכן סריקת נכסים</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הסוכן סורק את האינטרנט (יד2, מדלן ואתרי נדל"ן נוספים) ומציע נכסים שמתאימים לקריטריונים
          שלך. כל מועמד מגיע עם קישור למודעת המקור — אין נתונים מומצאים, ושדה חסר מוצג כ"אין מידע".
          שום נכס לא מתפרסם באתר ללא אישור שלך.
        </p>
        {msg && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">
            {msg}
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
        <button
          type="button"
          disabled={busy}
          onClick={() => doRun()}
          className="mt-4 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground disabled:opacity-60"
        >
          {busy ? "סורק…" : "סרוק עכשיו"}
        </button>
      </section>

      {/* קריטריונים */}
      <section className="soft-card p-5">
        <h3 className="font-extrabold text-primary">
          {form.id ? "עריכת קריטריונים" : "הגדרת קריטריונים לסריקה"}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="scout-label">
              שם הפרופיל
            </label>
            <input
              id="scout-label"
              className={input}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="scout-deal">
              סוג עסקה
            </label>
            <select
              id="scout-deal"
              className={input}
              value={form.deal_type}
              onChange={(e) => setForm({ ...form, deal_type: e.target.value })}
            >
              <option value="מכירה">מכירה</option>
              <option value="השכרה">השכרה</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="scout-min-price">
              מחיר מינימלי (₪)
            </label>
            <input
              id="scout-min-price"
              inputMode="numeric"
              className={input}
              value={form.min_price}
              onChange={(e) => setForm({ ...form, min_price: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="scout-max-price">
              מחיר מקסימלי (₪)
            </label>
            <input
              id="scout-max-price"
              inputMode="numeric"
              className={input}
              value={form.max_price}
              onChange={(e) => setForm({ ...form, max_price: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="scout-rooms">
              מינימום חדרים
            </label>
            <input
              id="scout-rooms"
              inputMode="decimal"
              className={input}
              value={form.min_rooms}
              onChange={(e) => setForm({ ...form, min_rooms: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="scout-size">
              מינימום מ"ר
            </label>
            <input
              id="scout-size"
              inputMode="numeric"
              className={input}
              value={form.min_size}
              onChange={(e) => setForm({ ...form, min_size: e.target.value })}
            />
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className={label}>שכונות (אופציונלי)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {neighborhoods.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setForm({ ...form, neighborhoods: toggle(form.neighborhoods, h) })}
                className={
                  form.neighborhoods.includes(h)
                    ? "rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground"
                    : "rounded-full border border-primary/30 px-3 py-1 text-xs font-bold text-primary"
                }
              >
                {h}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className={label}>אתרי מקור לסריקה</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SOURCES.map(([key, name]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, sources: toggle(form.sources, key) })}
                className={
                  form.sources.includes(key)
                    ? "rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground"
                    : "rounded-full border border-primary/30 px-3 py-1 text-xs font-bold text-primary"
                }
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["needs_mamad", 'ממ"ד'],
              ["needs_elevator", "מעלית"],
              ["needs_parking", "חניה"],
              ["needs_balcony", "מרפסת"],
              ["is_active", "פרופיל פעיל"],
            ] as Array<[keyof Form, string]>
          ).map(([key, text]) => (
            <label key={String(key)} className="flex items-center gap-2 font-semibold text-primary">
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked } as Form)}
              />
              {text}
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className={label} htmlFor="scout-notes">
            הערות חופשיות לסוכן
          </label>
          <textarea
            id="scout-notes"
            rows={2}
            className={input}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="לדוגמה: עדיפות לדירות משופצות בקרבת הים"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            שמירת קריטריונים
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
            >
              ביטול עריכה
            </button>
          )}
        </div>

        {/* פרופילים קיימים */}
        <div className="mt-5 space-y-2">
          {profiles.isLoading && <p className="text-sm text-muted-foreground">טוען פרופילים…</p>}
          {profiles.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">עדיין לא הגדרת קריטריונים לסריקה.</p>
          )}
          {(profiles.data ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-primary/15 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-primary">
                    {p.label} {p.is_active ? "" : "(כבוי)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.deal_type} · {p.city}
                    {p.neighborhoods?.length ? ` · ${p.neighborhoods.join(", ")}` : ""} ·{" "}
                    {p.max_price ? `עד ${p.max_price.toLocaleString("he-IL")} ₪` : "בלי תקרת מחיר"}{" "}
                    · עדכון אחרון:{" "}
                    {p.last_run_at ? new Date(p.last_run_at).toLocaleString("he-IL") : "אין מידע"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => doRun(p.id)}
                    className="rounded-lg bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground"
                  >
                    סרוק
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(toForm(p))}
                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    עריכה
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("למחוק את פרופיל הסריקה?")) {
                        void run(() => deleteProfile({ data: { id: p.id } }), "הפרופיל נמחק");
                      }
                    }}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive"
                  >
                    מחיקה
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* מועמדים */}
      <section className="soft-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-extrabold text-primary">מועמדים לאישור</h3>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="סינון מועמדים">
            {STATUSES.map(([key, text]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={status === key}
                onClick={() => setStatusTab(key)}
                className={
                  status === key
                    ? "rounded-xl bg-sun px-3 py-1.5 text-sm font-bold text-sun-foreground"
                    : "rounded-xl border border-primary/30 px-3 py-1.5 text-sm font-bold text-primary"
                }
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {candidates.isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">טוען מועמדים…</p>
        )}
        {candidates.data?.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">אין מועמדים בקטגוריה הזו כרגע.</p>
        )}

        <div className="mt-4 space-y-3">
          {(candidates.data ?? []).map((c: ScoutCandidateRow) => (
            <article key={c.id} className="rounded-xl border border-primary/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-primary">{c.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.deal_type ?? "אין מידע"} · {c.neighborhood ?? "אין מידע"} · {nis(c.price)} ·{" "}
                    {val(c.rooms, " חד'")} · {val(c.size_sqm, ' מ"ר')}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                  {c.source_site} · התאמה {c.match_score}%
                </span>
              </div>

              {c.match_reason && <p className="mt-2 text-sm text-foreground">{c.match_reason}</p>}
              {c.raw_summary && (
                <p className="mt-1 text-xs text-muted-foreground">{c.raw_summary}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  צפה במודעת המקור
                </a>
                {c.status !== "approved" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => approve({ data: { id: c.id } }),
                        "נוצרה טיוטת נכס — ערכו אותה בטאב נכסים",
                      )
                    }
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    אישור — צור טיוטת נכס
                  </button>
                )}
                {c.status === "new" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => setStatus({ data: { id: c.id, status: "rejected" } }),
                        "המועמד נדחה",
                      )
                    }
                    className="rounded-xl border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive"
                  >
                    דחייה
                  </button>
                )}
                {c.status === "rejected" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => setStatus({ data: { id: c.id, status: "new" } }),
                        "המועמד הוחזר לרשימה",
                      )
                    }
                    className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    החזרה לרשימה
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminScout;
