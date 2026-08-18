import { useState } from "react";
import { Languages, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminTranslateFields } from "@/lib/translate.functions";
import { LOCALE_META, URL_LOCALES } from "@/lib/i18n";

/* ============================================================
 * עורך תרגומים לאדמין: סטריפ טאבים EN | FR | RU עבור קבוצת
 * שדות טקסט. כל טאב מציג את המקור העברי לצד שדה התרגום,
 * עם כפתור "תרגום אוטומטי מעברית" (ניתן לעריכה לפני שמירה).
 * הערך נשמר במבנה { en: {key: text}, fr: ..., ru: ... } והאב
 * אחראי להמיר אותו למבנה translations של הרשומה.
 * ============================================================ */

export type TranslateFieldDef = {
  key: string;
  label: string;
  /** הטקסט העברי הנוכחי (המקור לתרגום) */
  source: string;
  multiline?: boolean;
};

export type FlatTranslations = Record<string, Record<string, string>>;

type Props = {
  title?: string;
  fields: TranslateFieldDef[];
  value: FlatTranslations;
  onChange: (next: FlatTranslations) => void;
  disabled?: boolean;
};

export function AdminTranslateTabs({ title, fields, value, onChange, disabled }: Props) {
  const translate = useServerFn(adminTranslateFields);
  const [active, setActive] = useState<(typeof URL_LOCALES)[number]>("en");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current = value[active] ?? {};

  const setField = (key: string, text: string) =>
    onChange({ ...value, [active]: { ...current, [key]: text } });

  const autoTranslate = async () => {
    const source: Record<string, string> = {};
    for (const f of fields) if (f.source.trim()) source[f.key] = f.source;
    if (!Object.keys(source).length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await translate({ data: { fields: source, target: active } });
      onChange({ ...value, [active]: { ...current, ...res.translations } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "התרגום האוטומטי נכשל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-border p-4">
      <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary">
        <Languages className="size-4 text-sun" aria-hidden="true" />
        {title ?? "תרגומים לשפות האתר"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        שדה שנשאר ריק יוצג בעברית (או בתרגום ברירת המחדל של האתר) בשפה הזו.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="שפות תרגום">
        {URL_LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={active === locale}
            onClick={() => setActive(locale)}
            className={
              active === locale
                ? "rounded-lg bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground"
                : "rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
            }
          >
            {LOCALE_META[locale].name}
          </button>
        ))}
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => void autoTranslate()}
          className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-sun px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-60"
        >
          <Sparkles className="size-3.5 text-sun" aria-hidden="true" />
          {busy ? "מתרגם…" : `תרגום אוטומטי מעברית ל${LOCALE_META[active].name}`}
        </button>
      </div>

      {err && (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {err}
        </p>
      )}

      <div className="mt-3 grid gap-3">
        {fields.map((f) => (
          <label className="block" key={f.key}>
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {f.label} — {LOCALE_META[active].name}
            </span>
            {f.source.trim() && (
              <span className="mb-1 block rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
                עברית: {f.source}
              </span>
            )}
            {f.multiline ? (
              <textarea
                className="field min-h-20"
                dir="ltr"
                value={current[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            ) : (
              <input
                className="field"
                dir="ltr"
                value={current[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
