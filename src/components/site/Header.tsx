import { useState } from "react";
import { Menu, X, Phone, LogOut, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/sun-city-logo-real.png.asset.json";
import { useLive } from "@/lib/site-live";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { LangSwitcher } from "@/components/site/LangSwitcher";

const logo = logoAsset.url;

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function Header() {
  const { business } = useLive();
  const { user, logout } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollTo(id);
  };

  const displayName = user?.fullName?.trim() || user?.email || t.nav.defaultUser;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a
          href="#top"
          onClick={go("top")}
          className="flex items-center gap-2"
          aria-label={t.nav.toTopAria(business.name)}
        >
          <img src={logo} alt={t.nav.logoAlt} width={40} height={40} className="size-10" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-extrabold text-primary">
              Sun City <span className="text-sun">נדל"ן</span>
            </span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">{business.tagline}</span>
          </span>
        </a>

        <nav aria-label={t.nav.mainNavAria} className="hidden items-center gap-5 lg:flex">
          {t.nav.links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={go(l.id)}
              className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
            >
              {l.label}
            </a>
          ))}

          <LangSwitcher />

          <a
            href={`tel:${business.phoneTel}`}
            className="flex items-center gap-1.5 text-sm font-bold text-primary"
            aria-label={t.nav.callAria(business.phone)}
            dir="ltr"
          >
            <Phone className="size-4 text-sun" aria-hidden="true" />
            {business.phone}
          </a>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span
                  className="hidden items-center gap-1.5 text-sm font-bold text-primary xl:flex"
                  title={user.email}
                >
                  <User className="size-4 text-sun" aria-hidden="true" />
                  {t.nav.hello} {displayName}
                </span>
                <Link
                  to="/account"
                  className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
                >
                  {t.nav.myAccount}
                </Link>
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
                  >
                    {t.nav.adminSite}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1 text-sm font-bold text-destructive transition-colors hover:text-destructive/80"
                  aria-label={t.nav.logoutAria}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden xl:inline">{t.nav.logout}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
                >
                  {t.nav.authArea}
                </Link>
                <a
                  href="#sellers"
                  onClick={go("sellers")}
                  className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground shadow-soft transition-transform hover:-translate-y-0.5"
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
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label={t.nav.mobileNavAria} className="border-t border-border bg-card lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            <li className="border-b border-border/70 py-3">
              <LangSwitcher big />
            </li>
            {t.nav.links.map((l) => (
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
                {user.isAdmin && (
                  <li>
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block border-b border-border/70 py-3 text-base font-semibold text-foreground"
                    >
                      {t.nav.adminSite}
                    </Link>
                  </li>
                )}
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
