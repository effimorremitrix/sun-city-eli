import { Link } from "@tanstack/react-router";
import { LOCALES, LOCALE_META, useLang, type Locale } from "@/lib/i18n";

/* ============================================================
 * בורר שפות בדגלים — שורת דגלי SVG בהדר (בהשראת lahav-n.co.il):
 * דגל לכל שפה, פינות מעוגלות, צל עדין, התרוממות בריחוף,
 * והשפה הפעילה מסומנת ב-outline בצבע הענבר של המותג.
 * העברית מקושרת לנתיב הראשי, שאר השפות ל-/en, /fr, /ru.
 * ============================================================ */

function FlagIsrael() {
  return (
    <svg viewBox="0 0 26 18" className="size-full" aria-hidden="true" focusable="false">
      <rect width="26" height="18" fill="#fff" />
      <rect y="2" width="26" height="2.6" fill="#0038b8" />
      <rect y="13.4" width="26" height="2.6" fill="#0038b8" />
      <g stroke="#0038b8" strokeWidth="0.9" fill="none">
        <path d="M13 5.4 15.8 10.2 10.2 10.2 Z" />
        <path d="M13 12.6 10.2 7.8 15.8 7.8 Z" />
      </g>
    </svg>
  );
}

function FlagUk() {
  return (
    <svg viewBox="0 0 26 18" className="size-full" aria-hidden="true" focusable="false">
      <rect width="26" height="18" fill="#012169" />
      <path d="M0 0 26 18 M26 0 0 18" stroke="#fff" strokeWidth="3.6" />
      <path d="M0 0 26 18 M26 0 0 18" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M13 0 V18 M0 9 H26" stroke="#fff" strokeWidth="6" />
      <path d="M13 0 V18 M0 9 H26" stroke="#C8102E" strokeWidth="3.4" />
    </svg>
  );
}

function FlagFrance() {
  return (
    <svg viewBox="0 0 26 18" className="size-full" aria-hidden="true" focusable="false">
      <rect width="26" height="18" fill="#fff" />
      <rect width="8.67" height="18" fill="#002395" />
      <rect x="17.33" width="8.67" height="18" fill="#ED2939" />
    </svg>
  );
}

function FlagRussia() {
  return (
    <svg viewBox="0 0 26 18" className="size-full" aria-hidden="true" focusable="false">
      <rect width="26" height="18" fill="#fff" />
      <rect y="6" width="26" height="6" fill="#0039A6" />
      <rect y="12" width="26" height="6" fill="#D52B1E" />
    </svg>
  );
}

const FLAGS: Record<Locale, () => React.JSX.Element> = {
  he: FlagIsrael,
  en: FlagUk,
  fr: FlagFrance,
  ru: FlagRussia,
};

function FlagLink({ locale, big }: { locale: Locale; big?: boolean | undefined }) {
  const { lang } = useLang();
  const Flag = FLAGS[locale];
  const meta = LOCALE_META[locale];
  const active = lang === locale;

  return (
    <Link
      to="/{-$lang}"
      params={{ lang: locale === "he" ? undefined : locale }}
      resetScroll
      aria-label={meta.name}
      title={meta.name}
      aria-current={active ? "page" : undefined}
      className={`block shrink-0 overflow-hidden rounded-[4px] shadow-soft transition-transform hover:-translate-y-[1px] ${
        big ? "h-[25px] w-[36px]" : "h-[18px] w-[26px]"
      } ${active ? "outline-2 outline-offset-2 outline-sun" : ""}`}
    >
      <Flag />
    </Link>
  );
}

export function LangSwitcher({ big, className }: { big?: boolean; className?: string }) {
  const { t } = useLang();
  return (
    <div
      role="group"
      aria-label={t.nav.langsLabel}
      className={`flex items-center ${big ? "gap-3" : "gap-2"} ${className ?? ""}`}
    >
      {LOCALES.map((locale) => (
        <FlagLink key={locale} locale={locale} big={big} />
      ))}
    </div>
  );
}
