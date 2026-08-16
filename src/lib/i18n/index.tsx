import { createContext, useContext, type ReactNode } from "react";
import { he, type Dict } from "./he";
import { en } from "./en";
import { fr } from "./fr";
import { ru } from "./ru";

export type Lang = "he" | "en" | "fr" | "ru";

export const LANGS: Lang[] = ["he", "en", "fr", "ru"];

export const DICTS: Record<Lang, Dict> = { he, en, fr, ru };

/** מזהה שפה מה-pathname: /en/... → en, אחרת עברית (ללא prefix) */
export function langFromPath(pathname: string): Lang {
  const first = pathname.split("/").filter(Boolean)[0];
  return first === "en" || first === "fr" || first === "ru" ? first : "he";
}

/** ה-path המקביל בשפה אחרת (עברית בשורש, שאר השפות עם prefix) */
export function pathForLang(pathname: string, lang: Lang): string {
  const parts = pathname.split("/").filter(Boolean);
  const current = langFromPath(pathname);
  const rest = current === "he" ? parts : parts.slice(1);
  const prefix = lang === "he" ? "" : `/${lang}`;
  const suffix = rest.length ? `/${rest.join("/")}` : "";
  return prefix + suffix || "/";
}

const I18nContext = createContext<Lang>("he");

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <I18nContext.Provider value={lang}>{children}</I18nContext.Provider>;
}

export const useLang = (): Lang => useContext(I18nContext);

/** המילון של שפת הדף הנוכחית */
export const useT = (): Dict => DICTS[useContext(I18nContext)];

/** תגי hreflang לכל גרסאות השפה של path נתון */
export function hreflangLinks(pathname: string, origin = "") {
  const canonicalPath = pathForLang(pathname, langFromPath(pathname));
  return [
    ...LANGS.map((lang) => ({
      rel: "alternate",
      hrefLang: lang,
      href: origin + pathForLang(pathname, lang),
    })),
    { rel: "alternate", hrefLang: "x-default", href: origin + pathForLang(pathname, "he") },
    { rel: "canonical", href: origin + canonicalPath },
  ];
}
