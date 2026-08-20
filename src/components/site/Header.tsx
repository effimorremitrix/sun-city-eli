import { useState } from "react";
import { Menu, X, Phone, LogOut, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/sun-city-logo-icon.svg";
import { useLive } from "@/lib/site-live";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { LangSwitcher } from "@/components/site/LangSwitcher";
import { SocialLinks } from "@/components/site/icons/SocialIcons";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function Header() {
  const { business, isHome } = useLive();
  const { user, logout } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  // בדומיין הראשי אין מדור צוות, ולכן גם אין קישור אליו בתפריט
  const navLinks = isHome ? t.nav.links.filter((l) => l.id !== "team") : t.nav.links;

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollTo(id);
  };

  const displayName = user?.fullName?.trim() || user?.email || t.nav.defaultUser;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* בדסקטופ צר (lg) מוצג רק סמל הלוגו; שם המותג והסלוגן חוזרים מ-xl.
            שורת הסלוגן מתקצרת (truncate) כשחסר מקום — כך הנאב לא נשבר לעולם. */}
        <a
          href="#top"
          onClick={go("top")}
          className="flex min-w-0 items-center gap-2"
          aria-label={t.nav.toTopAria(business.name)}
        >
          <img
            src={business.logoIconUrl || logo}
            alt={t.nav.logoAlt}
            width={40}
            height={40}
            className="size-10 shrink-0 object-contain"
          />
          <span className="flex min-w-0 flex-col leading-none lg:hidden xl:flex">
            <span className="whitespace-nowrap font-display text-base font-extrabold text-primary">
              Sun City <span className="text-sun">{t.nav.brandSuffix}</span>
            </span>
            {/* שם הסוכן של הדף — בדף אישי זה הסוכן שלו, בעמוד הבית סוכן ברירת המחדל.
                כשאין שם סוכן נשארת השורה המקורית עם הסלוגן. */}
            <span className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {business.agentName ? (
                <>
                  <span className="font-bold text-primary">{business.agentName}</span>
                  {business.roleTitle && <span> · {business.roleTitle}</span>}
                </>
              ) : (
                business.tagline
              )}
            </span>
          </span>
        </a>

        {/* whitespace-nowrap על כל פריט: בלעדיו flex מכווץ קישורים ארוכים
            ("השירותים שלנו", "Vendre un bien") לשתי שורות. התקציב צר (מכל 1152px),
            ולכן טלפון ואזור אישי מוצגים כאייקונים, והטקסט חוזר בעברית בלבד מ-xl
            (rtl:) — בשפות הלטיניות התוויות הארוכות לא נכנסות בשום רוחב. */}
        <nav aria-label={t.nav.mainNavAria} className="hidden items-center gap-3 lg:flex xl:gap-4">
          {navLinks.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={go(l.id)}
              className="whitespace-nowrap text-sm font-semibold text-foreground transition-colors hover:text-sun"
            >
              {l.label}
            </a>
          ))}

          {/* מפריד: בלי הקו והריפוד הקישורים והדגל נקראים כרצף אחד */}
          <LangSwitcher className="ms-1 border-s border-border ps-3" />

          <a
            href={`tel:${business.phoneTel}`}
            className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-primary"
            aria-label={t.nav.callAria(business.phone)}
            title={business.phone}
            dir="ltr"
          >
            <Phone className="size-4 text-sun" aria-hidden="true" />
            <span className="hidden xl:rtl:inline">{business.phone}</span>
          </a>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/account"
                  className="whitespace-nowrap text-sm font-semibold text-foreground transition-colors hover:text-sun"
                  title={user.email}
                >
                  {t.nav.myAccount}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1 whitespace-nowrap text-sm font-bold text-destructive transition-colors hover:text-destructive/80"
                  aria-label={t.nav.logoutAria}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden xl:rtl:inline">{t.nav.logout}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  aria-label={t.nav.authArea}
                  title={t.nav.authArea}
                  className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-foreground transition-colors hover:text-sun"
                >
                  <User className="size-4 text-sun" aria-hidden="true" />
                  <span className="hidden xl:rtl:inline">{t.nav.authArea}</span>
                </Link>
                <a
                  href="#sellers"
                  onClick={go("sellers")}
                  className="whitespace-nowrap rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  {t.nav.freeValuation}
                </a>
              </>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label={t.nav.mobileNavAria} className="border-t border-border bg-card lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            <li className="border-b border-border/70 py-3">
              <LangSwitcher big />
            </li>
            <li className="border-b border-border/70 py-3">
              <SocialLinks size="size-8" />
            </li>
            {navLinks.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={go(l.id)}
                  className="block border-b border-border/70 py-3 text-base font-semibold text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`tel:${business.phoneTel}`}
                className="block border-b border-border/70 py-3 text-base font-semibold text-primary"
                dir="ltr"
              >
                {business.phone}
              </a>
            </li>

            {user ? (
              <>
                <li className="border-b border-border/70 py-3">
                  <span className="flex items-center gap-2 text-base font-bold text-primary">
                    <User className="size-4 text-sun" aria-hidden="true" />
                    {t.nav.hello} {displayName}
                  </span>
                </li>
                <li>
                  <Link
                    to="/account"
                    onClick={() => setOpen(false)}
                    className="block border-b border-border/70 py-3 text-base font-semibold text-foreground"
                  >
                    {t.nav.myAccount}
                  </Link>
                </li>
                <li className="py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive py-3 text-base font-bold text-destructive"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {t.nav.logoutFull}
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="block border-b border-border/70 py-3 text-base font-semibold text-foreground"
                  >
                    {t.nav.authArea}
                  </Link>
                </li>
                <li className="py-3">
                  <a
                    href="#sellers"
                    onClick={go("sellers")}
                    className="block rounded-xl bg-sun py-3 text-center text-base font-bold text-sun-foreground"
                  >
                    {t.nav.freeValuation}
                  </a>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
