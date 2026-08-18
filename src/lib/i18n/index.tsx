import { createContext, useContext, type ReactNode } from "react";
import { he, type Dict } from "./he";
import { en } from "./en";
import { fr } from "./fr";
import { ru } from "./ru";

/* ============================================================
 * ליבת השפות של האתר: עברית (ברירת מחדל, RTL), אנגלית, צרפתית
 * ורוסית. העברית מוגשת בנתיב הראשי ("/"), שאר השפות בנתיב
 * "/en" / "/fr" / "/ru" דרך הסגמנט האופציונלי {-$lang}.
 * ============================================================ */

export const LOCALES = ["he", "en", "fr", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

/** השפות שמופיעות בכתובת ה-URL (עברית קנונית בנתיב הראשי) */
export const URL_LOCALES = ["en", "fr", "ru"] as const;

export const DEFAULT_LOCALE: Locale = "he";

export const LOCALE_META: Record<Locale, { name: string; path: string; intl: string; og: string }> =
  {
    he: { name: "עברית", path: "/", intl: "he-IL", og: "he_IL" },
    en: { name: "English", path: "/en", intl: "en-US", og: "en_US" },
    fr: { name: "Français", path: "/fr", intl: "fr-FR", og: "fr_FR" },
    ru: { name: "Русский", path: "/ru", intl: "ru-RU", og: "ru_RU" },
  };

export const DICTS: Record<Locale, Dict> = { he, en, fr, ru };

export const isLocale = (v: string | undefined): v is Locale =>
  !!v && (LOCALES as readonly string[]).includes(v);

export const dirFor = (lang: Locale): "rtl" | "ltr" => (lang === "he" ? "rtl" : "ltr");

export type LangContextValue = {
  lang: Locale;
  dir: "rtl" | "ltr";
  t: Dict;
};

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LOCALE,
  dir: "rtl",
  t: he,
});

export function LangProvider({ lang, children }: { lang: Locale; children: ReactNode }) {
  return (
    <LangContext.Provider value={{ lang, dir: dirFor(lang), t: DICTS[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/* ---------------------------- עזרי תצוגה ---------------------------- */

/** תרגום ערך קנוני מהמסד (שכונה/תגית/סוג עסקה) — נופל חזרה לערך המקורי */
export const mapValue = (map: Record<string, string>, value: string | null | undefined) =>
  value == null ? value : (map[value] ?? value);

/** מחיר בש"ח בפורמט המקומי של השפה */
export const formatPrice = (n: number, lang: Locale = DEFAULT_LOCALE) => {
  const formatted = n.toLocaleString(LOCALE_META[lang].intl);
  return lang === "he" ? `${formatted} ₪` : `₪${formatted}`;
};

/** תאריך "עודכן ב" בפורמט המקומי; כשאין תאריך — "אין מידע" בשפת הדף */
export const formatUpdatedFor = (iso: string | null | undefined, lang: Locale) => {
  const noInfo = DICTS[lang].misc.noInfo;
  if (!iso) return noInfo;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return noInfo;
  return date.toLocaleDateString(LOCALE_META[lang].intl, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export type { Dict };
