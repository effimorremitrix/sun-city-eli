import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Settings2 } from "lucide-react";
import { adminGetSettings, adminUpdateSettings } from "@/lib/system.functions";
import type { AppSettings } from "@/lib/settings.server";

/* ============================================================
 * הגדרות המערכת (מנהל ראשי בלבד) — מכסות AI, סריקת שוק, הגנות
 * מפני בוטים ופרטי מערכת. נשמר רק מה שהשתנה.
 * ============================================================ */

type Editable = Omit<AppSettings, "cron_secret">;
type Key = keyof Editable;
type Values = Record<Key, string | number | boolean>;

type Field = {
  key: Key;
  label: string;
  type: "bool" | "num" | "text" | "model";
  hint?: string;
  /** מספר: צעד וטווח */
  step?: number;
  min?: number;
};

type Group = { title: string; help: string; fields: Field[]; warning?: string };

const GROUPS: Group[] = [
  {
    title: "חיפוש חכם ו-AI",
    help: "כל חיפוש חכם עולה כמה אגורות (קריאה למודל שפה). המכסות מגנות מבוטים ומגולשים שמנצלים לרעה; תקרת הדולרים היומית עוצרת את החיפוש החכם לכולם כשהיא מתמלאת, והאתר ממשיך לעבוד עם החיפוש הרגיל.",
    fields: [
      { key: "ai_search_enabled", label: "חיפוש חכם פעיל", type: "bool" },
      { key: "ai_search_anon_daily", label: "חיפושים ליום לגולש אנונימי", type: "num", min: 0 },
      { key: "ai_search_user_daily", label: "חיפושים ליום למשתמש רשום", type: "num", min: 0 },
      {
        key: "ai_search_burst_per_minute",
        label: "חיפושים לדקה (מגן מפרצי בקשות)",
        type: "num",
        min: 0,
      },
      { key: "ai_daily_usd_cap", label: "תקרת הוצאה יומית (דולר)", type: "num", min: 0, step: 0.5 },
      {
        key: "ai_model",
        label: "מודל השפה",
        type: "model",
        hint: "מודל חזק יותר = תשובות טובות יותר אבל יקר יותר לכל חיפוש",
      },
      {
        key: "web_search_user_daily",
        label: "סריקות רשת ליום למשתמש",
        type: "num",
        min: 0,
        hint: "חיפוש ברשת מתוך הסוכן האישי — יקר יותר מחיפוש רגיל",
      },
    ],
  },
  {
    title: "סריקת שוק",
    help: "הסריקה מביאה מודעות מהשוק לפי הביקוש של הלקוחות (פרופילי חיפוש). כל משימה = שכונה וסוג עסקה; ככל שיותר משימות בכל ריצה, הסריקה יקרה וארוכה יותר. מודעה שלא נראתה שוב אחרי ימי ה-TTL נעלמת מהאתר.",
    warning:
      "מקורות LLM: סריקה דרך מודל שפה עם חיפוש ברשת עולה כסף אמיתי בכל ריצה (עשרות אגורות עד שקלים לכל משימה). מומלץ להשאיר כבוי אלא אם המקורות הרגילים לא מספקים.",
    fields: [
      { key: "market_scan_enabled", label: "סריקת שוק פעילה", type: "bool" },
      { key: "market_scan_llm_sources_enabled", label: "מקורות LLM (בתשלום) פעילים", type: "bool" },
      { key: "market_scan_tasks_per_run", label: "משימות בכל ריצה", type: "num", min: 0 },
      {
        key: "market_listing_ttl_days",
        label: "ימים עד שמודעה שלא נראתה נעלמת (TTL)",
        type: "num",
        min: 0,
      },
    ],
  },
  {
    title: "הגנות",
    help: 'מגבלות קצב לטפסים הציבוריים. מי שחוצה מגבלה פי (המכפיל) נחסם אוטומטית למספר השעות שנקבע; החסימות מופיעות בטאב "מערכת" ואפשר לשחרר אותן ידנית. ערכים נמוכים מדי עלולים לחסום לקוחות אמיתיים בשעות עומס.',
    fields: [
      { key: "leads_per_minute", label: "פניות (לידים) לדקה מאותה כתובת", type: "num", min: 0 },
      { key: "signup_per_hour", label: "הרשמות לשעה מאותה כתובת", type: "num", min: 0 },
      { key: "feedback_per_minute", label: "משובים לדקה", type: "num", min: 0 },
      { key: "track_per_minute", label: "אירועי מדידה לדקה", type: "num", min: 0 },
      {
        key: "auto_block_multiplier",
        label: "מכפיל לחסימה אוטומטית",
        type: "num",
        min: 0,
        hint: "למשל 3 = חסימה כשחוצים פי 3 מהמגבלה",
      },
      { key: "auto_block_hours", label: "משך חסימה אוטומטית (שעות)", type: "num", min: 0 },
    ],
  },
  {
    title: "מערכת",
    help: "כתובת האתר משמשת בכל הקישורים שנשלחים ללקוחות (מייל, וואטסאפ) ולמתזמן. הגיבוי היומי נשמר באחסון ונמחק אחרי ימי השמירה; התראות בריאות שולחות מייל למנהל כשרכיב נופל.",
    fields: [
      {
        key: "site_url",
        label: "כתובת האתר (site_url)",
        type: "text",
        hint: "בלי קו נטוי בסוף, למשל https://example.com",
      },
      { key: "backup_retention_days", label: "ימי שמירת גיבויים", type: "num", min: 0 },
      { key: "health_alerts_enabled", label: "התראות בריאות למנהל", type: "bool" },
    ],
  },
];

const toValues = (s: Editable): Values => ({ ...s }) as Values;

export default function AdminSettings() {
  const getSettings = useServerFn(adminGetSettings);
  const updateSettings = useServerFn(adminUpdateSettings);
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => getSettings() });

  const [saved, setSaved] = useState<Values | null>(null);
  const [form, setForm] = useState<Values | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    const v = toValues(settings.data.settings);
    setSaved(v);
    setForm(v);
  }, [settings.data]);

  const changed = (): Partial<Values> => {
    if (!form || !saved) return {};
    const patch: Partial<Values> = {};
    for (const key of Object.keys(form) as Key[]) {
      if (form[key] !== saved[key]) patch[key] = form[key];
    }
    return patch;
  };
  const patch = changed();
  const dirty = Object.keys(patch).length > 0;

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      // מספרים נשלחים כמספרים (השדות שומרים מחרוזת בזמן ההקלדה)
      const clean: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(patch)) {
        const def = saved?.[k as Key];
        if (typeof def === "number") {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) throw new Error(`ערך לא תקין בשדה ${k}`);
          clean[k] = n;
        } else if (v !== undefined) clean[k] = v;
      }
      const res = await updateSettings({ data: { patch: clean } });
      const v = toValues(res.settings);
      setSaved(v);
      setForm(v);
      setMsg(`נשמר: ${Object.keys(clean).length} הגדרות עודכנו`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const set = (key: Key, value: string | number | boolean) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <Settings2 className="size-5 text-sun" aria-hidden="true" />
        הגדרות המערכת
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        שינוי נכנס לתוקף תוך כחצי דקה בכל השרתים. כל שמירה נרשמת ביומן הפעילות.
      </p>

      {settings.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען…</p>}
      {settings.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת ההגדרות נכשלה: {settings.error instanceof Error ? settings.error.message : ""}
        </p>
      )}
      {msg && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>
      )}
      {err && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {form && (
        <div className="mt-4 grid gap-4">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-extrabold text-primary">{g.title}</legend>
              <p className="text-xs leading-relaxed text-muted-foreground">{g.help}</p>
              {g.warning && (
                <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-orange-50 p-2 text-xs font-semibold text-orange-800">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {g.warning}
                </p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.fields.map((f) => {
                  const value = form[f.key];
                  const isDirty = saved != null && value !== saved[f.key];
                  const labelCls = `mb-1 block text-xs font-bold ${isDirty ? "text-sun" : "text-muted-foreground"}`;
                  if (f.type === "bool")
                    return (
                      <label key={f.key} className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={value === true}
                          onChange={(e) => set(f.key, e.target.checked)}
                        />
                        <span className={isDirty ? "text-sun" : ""}>{f.label}</span>
                        {f.hint && (
                          <span className="text-xs text-muted-foreground">({f.hint})</span>
                        )}
                      </label>
                    );
                  if (f.type === "model")
                    return (
                      <label key={f.key} className="block">
                        <span className={labelCls}>{f.label}</span>
                        <select
                          className="field"
                          dir="ltr"
                          value={String(value)}
                          onChange={(e) => set(f.key, e.target.value)}
                        >
                          {!(settings.data?.models ?? []).includes(String(value)) && (
                            <option value={String(value)}>{String(value)}</option>
                          )}
                          {(settings.data?.models ?? []).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        {f.hint && (
                          <span className="mt-1 block text-xs text-muted-foreground">{f.hint}</span>
                        )}
                      </label>
                    );
                  return (
                    <label key={f.key} className="block">
                      <span className={labelCls}>{f.label}</span>
                      <input
                        className="field"
                        dir="ltr"
                        type={f.type === "num" ? "number" : "text"}
                        min={f.min}
                        step={f.step ?? (f.type === "num" ? 1 : undefined)}
                        value={String(value)}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                      {f.hint && (
                        <span className="mt-1 block text-xs text-muted-foreground">{f.hint}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void save()}
              className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-50"
            >
              {busy
                ? "שומר…"
                : dirty
                  ? `שמירת ${Object.keys(patch).length} שינויים`
                  : "אין שינויים"}
            </button>
            {dirty && (
              <button
                type="button"
                disabled={busy}
                onClick={() => saved && setForm(saved)}
                className="text-sm font-bold text-muted-foreground underline"
              >
                ביטול השינויים
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
