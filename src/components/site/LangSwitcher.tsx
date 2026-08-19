import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_META, useLang, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ============================================================
 * בורר שפות בדגלים (בהשראת lahav-n.co.il):
 * בדסקטופ — תפריט נפתח: דגל השפה הנוכחית + חץ, והרשימה נפתחת
 * אנכית עם דגל ושם כל שפה (חוסך את רוחב ארבעת הדגלים בהדר).
 * במובייל (big) — שורת דגלים שטוחה כבעבר.
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

function FlagLink({ locale }: { locale: Locale }) {
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
      className={`block h-[25px] w-[36px] shrink-0 overflow-hidden rounded-[4px] shadow-soft transition-transform hover:-translate-y-[1px] ${
        active ? "outline-2 outline-offset-2 outline-sun" : ""
      }`}
    >
      <Flag />
    </Link>
  );
}

export function LangSwitcher({ big, className }: { big?: boolean; className?: string }) {
  const { t, lang, dir } = useLang();

  // הפאנל במובייל: שורת דגלים שטוחה — כל השפות גלויות בלחיצה אחת
  if (big) {
    return (
      <div
        role="group"
        aria-label={t.nav.langsLabel}
        className={`flex items-center gap-3 ${className ?? ""}`}
      >
        {LOCALES.map((locale) => (
          <FlagLink key={locale} locale={locale} />
        ))}
      </div>
    );
  }

  const Current = FLAGS[lang];
  return (
    <div className={`flex items-center ${className ?? ""}`}>
      <DropdownMenu dir={dir} modal={false}>
        <DropdownMenuTrigger
          aria-label={t.nav.langsLabel}
          className="flex items-center gap-1.5 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
        >
          <span className="block h-[18px] w-[26px] shrink-0 overflow-hidden rounded-[4px] shadow-soft">
            <Current />
          </span>
          <ChevronDown className="size-4 text-primary" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40">
          {LOCALES.map((locale) => {
            const Flag = FLAGS[locale];
            const active = lang === locale;
            return (
              <DropdownMenuItem key={locale} asChild>
                <Link
                  to="/{-$lang}"
                  params={{ lang: locale === "he" ? undefined : locale }}
                  resetScroll
                  aria-current={active ? "page" : undefined}
                  className={`flex cursor-pointer items-center gap-2 ${active ? "font-bold text-primary" : ""}`}
                >
                  <span className="block h-[18px] w-[26px] shrink-0 overflow-hidden rounded-[4px] shadow-soft">
                    <Flag />
                  </span>
                  {LOCALE_META[locale].name}
                  {active && <Check className="ms-auto size-4 text-sun" aria-hidden="true" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
