import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);

  // בדומיין הראשי אין מדור צוות, ולכן גם אין קישור אליו בתפריט
  const navLinks = isHome ? t.nav.links.filter((l) => l.id !== "team") : t.nav.links;

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollTo(id);
  };

  const displayName = user?.fullName?.trim() || user?.email || t.nav.defaultUser;

  /*
   * ============================================================
   * למה התפריט נמדד ולא נקבע ב-breakpoint בלבד:
   * רוחב התפריט תלוי בשפה ובמצב ההתחברות — תשעה קישורים בעברית הם
   * ~1030px, ובצרפתית ~1380px. כל breakpoint קבוע נכון לשפה אחת ושבור
   * באחרת, וזה בדיוק מה שקרה בשטח: הקישורים גלשו אל מעל הלוגו.
   * לכן: התפריט מוצג רק אם הוא באמת נכנס לצד הלוגו ברוחב הנוכחי, ואחרת
   * עוברים לתפריט ההמבורגר. המדידה נעשית פעם אחת לכל צירוף שפה/התחברות
   * (רוחב הפריטים אינו תלוי ברוחב המסך — כולם whitespace-nowrap), ובכל
   * שינוי רוחב רק משווים מול הרוחב השמור.
   * ============================================================
   */
  const isSignedIn = Boolean(user);
  const rowRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const naturalNavWidth = useRef(0);
  const [navFits, setNavFits] = useState(true);

  useLayoutEffect(() => {
    // שפה או מצב התחברות השתנו — הרוחב השמור כבר לא רלוונטי
    naturalNavWidth.current = 0;
    setNavFits(true);
  }, [lang, isSignedIn]);

  useEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      if (!row) return;
      const nav = navRef.current;
      if (nav && nav.offsetWidth > 0) naturalNavWidth.current = nav.offsetWidth;
      const needed = naturalNavWidth.current;
      if (!needed) return;
      // clientWidth כולל את הריפוד האופקי — בלי להחסיר אותו התפריט "נכנס"
      // על הנייר וגלש בפועל (נצפה בצרפתית ב-1440px)
      const style = window.getComputedStyle(row);
      const padding =
        (parseFloat(style.paddingInlineStart) || 0) + (parseFloat(style.paddingInlineEnd) || 0);
      // מקום ללוגו (סמל 40px) + המרווח בין הלוגו לתפריט
      const available = row.clientWidth - padding - 40 - 16;
      setNavFits(needed <= available);
    };
    measure();
    const row = rowRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (row && ro) ro.observe(row);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [lang, isSignedIn, navLinks.length]);

  /* ה-breakpoint הוא שער ראשון בלבד (בנייד אין תפריט רוחבי כלל);
     ההחלטה הסופית היא המדידה שלמעלה. */
  const showDeskNav = navFits;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {/* רוחב ההדר אינו כבול ל-max-w-6xl של שאר הדף: תשעה קישורי ניווט +
          דגל + טלפון + כפתורי הפעולה רחבים מ-1152px בעברית, ולכן התפריט
          גלש אל מעל הלוגו. כאן יש מכל רחב יותר, והלוגו מקבל shrink-0 כך
          שלעולם אינו מתכווץ לאפס. */}
      <div
        ref={rowRef}
        className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4"
      >
        {/* הלוגו מתכווץ (min-w-0 + overflow-hidden) והנאב לא (shrink-0):
            כך קישור ארוך בתפריט לעולם אינו גולש אל מעל הלוגו. במצב אורח
            יש בתפריט שני כפתורים נוספים ("אזור אישי" ו"הערכת שווי"), ולכן
            שם המותג מוסתר כבר מ-lg וחוזר רק מ-xl. */}
        <a
          href="#top"
          onClick={go("top")}
          className="flex min-w-10 flex-1 items-center gap-2 overflow-hidden"
          aria-label={t.nav.toTopAria(business.name)}
        >
          <img
            src={business.logoIconUrl || logo}
            alt={t.nav.logoAlt}
            width={40}
            height={40}
            className="size-10 shrink-0 object-contain"
          />
          {/* שם המותג מוצג רק כשיש לו מקום אמיתי: בנייד/טאבלט (לפני התפריט
              הרוחבי) ובמסכים רחבים. בתחום שבו התפריט הרוחבי דחוס — מוצג
              סמל הלוגו בלבד. */}
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-display text-base font-extrabold text-primary">
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
        <nav
          ref={navRef}
          aria-label={t.nav.mainNavAria}
          className={`shrink-0 items-center gap-3 xl:gap-4 ${
            showDeskNav ? "hidden lg:flex" : "hidden"
          }`}
        >
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
            <span className="hidden 2xl:rtl:inline">{business.phone}</span>
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
                {/* כפתור בולט ל"אזור אישי" — לא עוד לינק טקסט חבוי */}
                <Link
                  to="/auth"
                  aria-label={t.nav.authArea}
                  title={t.nav.authArea}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-sun px-3 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-sun/10"
                >
                  <User className="size-4 text-sun" aria-hidden="true" />
                  <span className="hidden xl:inline">{t.nav.authArea}</span>
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

        <div className={`flex shrink-0 items-center gap-2 ${showDeskNav ? "lg:hidden" : ""}`}>
          {/* כניסה/אזור אישי — נגיש ישירות מהסרגל, בלי לפתוח את ההמבורגר */}
          <Link
            to={user ? "/account" : "/auth"}
            aria-label={user ? t.nav.myAccount : t.nav.authArea}
            className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border-2 border-sun px-2.5 text-sm font-bold text-primary"
          >
            <User className="size-4 text-sun" aria-hidden="true" />
            <span className="hidden min-[400px]:inline">
              {user ? t.nav.myAccount : t.nav.authArea}
            </span>
          </Link>
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
        <nav
          aria-label={t.nav.mobileNavAria}
          className={`border-t border-border bg-card ${showDeskNav ? "lg:hidden" : ""}`}
        >
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
                <li className="pt-3">
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sun py-3 text-base font-bold text-primary"
                  >
                    <User className="size-5 text-sun" aria-hidden="true" />
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
