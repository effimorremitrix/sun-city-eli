import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/i18n/seo";
import { DICTS, useStoredLocale, type Locale } from "@/lib/i18n";
import { useBackToSiteHref } from "@/lib/back-to-site";

/**
 * מעטפת משותפת לדפים המשפטיים (/privacy, /terms, /data-deletion).
 *
 * הדפים האלה חייבים להיות ציבוריים ודו-לשוניים: עברית היא ברירת המחדל, ואנגלית
 * נדרשת כי בודקי ה-App Review של Meta קוראים אנגלית. השפה נבחרת בפרמטר
 * `?lang=en` ולא ב-state, כדי ששני הנוסחים יגיעו מוכנים ב-HTML של השרת — הקרולר
 * facebookexternalhit לא מריץ JavaScript — וכדי שאפשר יהיה למסור לבודק קישור יציב.
 *
 * הגוף המשפטי קיים בעברית ובאנגלית בלבד; תוויות הניווט (חזרה, מסמכים נוספים,
 * "עודכן לאחרונה") מגיעות מהמילונים, ולכן בנוסח האנגלי הן מוצגות בשפה שהגולש
 * בחר באתר (אנגלית/צרפתית/רוסית) — יחד עם הערה שהנוסח המחייב הוא העברי.
 *
 * שימו לב: RootShell ב-__root.tsx גוזר את `<html lang dir>` מהסגמנט הראשון בכתובת
 * בלבד, ולכן /privacy?lang=en עדיין מקבל dir="rtl" מהשורש. מכאן שהכיווניות
 * הנכונה נקבעת כאן, על ה-<main>. המחלקות הלוגיות (pe-6, ms-1) נגזרות מה-dir
 * הקרוב ביותר ולכן מתהפכות כמצופה.
 */

export type LegalLang = "he" | "en";

/** נתיבי הדפים המשפטיים — משותף לוולידציה, למתג השפה ולקישורים ההדדיים. */
export type LegalPath = "/privacy" | "/terms" | "/data-deletion";

export type LegalSearch = { lang?: "en" };

/**
 * ולידציה של ?lang לכל שלושת הראוטים. מחזיר {} לעברית (ולא {lang:"he"}) כדי
 * שהכתובת הקנונית תישאר נקייה מפרמטרים — זו הכתובת שנרשמת ב-Meta App Dashboard.
 * כל ערך שאינו "en" (כולל "he", זבל או חוסר) נופל בחזרה לעברית בלי לזרוק.
 */
export const validateLegalSearch = (search: Record<string, unknown>): LegalSearch =>
  search["lang"] === "en" ? { lang: "en" } : {};

export const legalLang = (search: LegalSearch): LegalLang => (search.lang === "en" ? "en" : "he");

/**
 * בלוק ה-meta לדפים המשפטיים. הכותרת דו-לשונית בכוונה: היא אינה תלויה ב-?lang,
 * כך שבודק Meta רואה את הכותרת האנגלית בכל כתובת שיפתח.
 */
export function legalHead(input: { title: string; description: string; path: LegalPath }) {
  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}${input.path}` },
      { rel: "alternate", hrefLang: "he", href: `${SITE_URL}${input.path}` },
      { rel: "alternate", hrefLang: "en", href: `${SITE_URL}${input.path}?lang=en` },
      { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}${input.path}` },
    ],
  };
}

/** כותרת סעיף — אותו גודל שנעשה בו שימוש ב-accessibility.tsx. */
export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-xl font-bold">{children}</h2>;
}

/** רשימת תבליטים — pe-6 מתהפך לפי ה-dir של המעטפת. */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pe-6">{children}</ul>;
}

/** מפתח התווית במילון (misc) לכל דף משפטי */
const OTHER_PAGES: { path: LegalPath; key: "legalPrivacy" | "legalTerms" | "legalDataDeletion" }[] =
  [
    { path: "/privacy", key: "legalPrivacy" },
    { path: "/terms", key: "legalTerms" },
    { path: "/data-deletion", key: "legalDataDeletion" },
  ];

/** קישור שמשמר את השפה הנוכחית. עוגן רגיל ולא <Link> — עובד גם בלי JavaScript. */
const hrefFor = (path: string, lang: LegalLang) => (lang === "en" ? `${path}?lang=en` : path);

export function LegalPage({
  lang,
  path,
  title,
  updated,
  children,
}: {
  lang: LegalLang;
  path: LegalPath;
  /** כבר בשפה של `lang` */
  title: string;
  /** תאריך תוקף בפורמט ISO, למשל "2026-08-19" */
  updated: string;
  children: ReactNode;
}) {
  const he = lang === "he";
  // חוזרים לדף הציבורי האחרון שביקרו בו (כולל דף אישי של סוכן), לא לאתר המשרד
  const backHref = useBackToSiteHref();
  // תוויות הניווט: בנוסח האנגלי — בשפה שנבחרה באתר (אנגלית כברירת מחדל ב-SSR);
  // בטוח להידרציה: הערך הזכור מתעדכן רק אחרי ה-mount
  const stored = useStoredLocale();
  const uiLang: Locale = he ? "he" : stored === "he" ? "en" : stored;
  const t = DICTS[uiLang];

  return (
    <main lang={lang} dir={he ? "rtl" : "ltr"} className="mx-auto max-w-3xl px-4 py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={backHref} className="text-sm font-bold text-sun underline" lang={uiLang}>
          {t.misc.backHome}
        </a>

        {/* מתג שפה: עוגנים רגילים, כדי שגם קרולר בלי JS יגיע לנוסח האנגלי */}
        <nav
          aria-label={t.misc.legalLangSwitch}
          className="flex items-center gap-1 rounded-full border border-border p-0.5 text-sm"
        >
          <a
            href={path}
            hrefLang="he"
            aria-current={he ? "true" : undefined}
            className={`rounded-full px-3 py-1 ${he ? "bg-sun font-bold text-sun-foreground" : "text-muted-foreground"}`}
          >
            עברית
          </a>
          <a
            href={`${path}?lang=en`}
            hrefLang="en"
            aria-current={he ? undefined : "true"}
            className={`rounded-full px-3 py-1 ${he ? "text-muted-foreground" : "bg-sun font-bold text-sun-foreground"}`}
          >
            English
          </a>
        </nav>
      </div>

      {/* הנוסח המחייב הוא העברי — מוצג רק בנוסחים שאינם עברית */}
      {!he && (
        <p
          lang={uiLang}
          className="mt-4 rounded-xl border border-sun/40 bg-sun/10 px-4 py-2 text-sm text-foreground"
        >
          {t.misc.legalHebrewNotice}
        </p>
      )}

      <h1 className="mt-4 text-3xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground" lang={uiLang}>
        {t.misc.legalLastUpdated} <time dateTime={updated}>{updated}</time>
      </p>

      <div className="mt-6 space-y-4 leading-relaxed text-foreground">{children}</div>

      <nav
        aria-label={t.misc.legalOtherDocs}
        lang={uiLang}
        className="mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-6 text-sm"
      >
        {OTHER_PAGES.filter((p) => p.path !== path).map((p) => (
          <a key={p.path} href={hrefFor(p.path, lang)} className="text-sun underline">
            {t.misc[p.key]}
          </a>
        ))}
        {/* הצהרת הנגישות קיימת בעברית בלבד, ולכן בלי ?lang */}
        <a href="/accessibility" hrefLang="he" className="text-sun underline">
          {he ? t.misc.legalAccessibility : t.misc.legalAccessibilityHe}
        </a>
      </nav>
    </main>
  );
}
