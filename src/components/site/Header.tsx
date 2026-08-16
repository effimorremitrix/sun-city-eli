import { useState } from "react";
import { Menu, X, Phone, LogOut, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/sun-city-logo-real.png.asset.json";
import { useLive } from "@/lib/site-live";
import { useAuth } from "@/hooks/useAuth";

const logo = logoAsset.url;

const links = [
  { id: "properties", label: "נכסים" },
  { id: "sellers", label: "מוכרים דירה" },
  { id: "buyers", label: "לקונים" },
  { id: "services", label: "השירותים שלנו" },
  { id: "team", label: "הצוות" },
  { id: "contact", label: "צור קשר" },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function Header() {
  const { business } = useLive();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollTo(id);
  };

  const displayName = user?.fullName?.trim() || user?.email || "משתמש";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a
          href="#top"
          onClick={go("top")}
          className="flex items-center gap-2"
          aria-label={`${business.name} — לראש העמוד`}
        >
          <img src={logo} alt='לוגו סאן סיטי נדל"ן' width={40} height={40} className="size-10" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-extrabold text-primary">
              Sun City <span className="text-sun">נדל"ן</span>
            </span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">{business.tagline}</span>
          </span>
        </a>

        <nav aria-label="ניווט ראשי" className="hidden items-center gap-5 lg:flex">
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={go(l.id)}
              className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
            >
              {l.label}
            </a>
          ))}
          <a
            href={`tel:${business.phoneTel}`}
            className="flex items-center gap-1.5 text-sm font-bold text-primary"
            aria-label={`התקשרות למשרד ${business.phone}`}
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
                  שלום, {displayName}
                </span>
                <Link
                  to="/account"
                  className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
                >
                  האזור האישי
                </Link>
                {(user.isAdmin || user.isAgent) && (
                  <Link
                    to="/admin"
                    className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
                  >
                    ניהול האתר
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1 text-sm font-bold text-destructive transition-colors hover:text-destructive/80"
                  aria-label="התנתקות"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden xl:inline">יציאה</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-semibold text-foreground transition-colors hover:text-sun"
                >
                  אזור אישי
                </Link>
                <a
                  href="#sellers"
                  onClick={go("sellers")}
                  className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  הערכת שווי חינם
                </a>
              </>
            )}
          </div>
        </nav>

        <button
          type="button"
          aria-label={open ? "סגירת תפריט הניווט" : "פתיחת תפריט הניווט"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav aria-label="ניווט במובייל" className="border-t border-border bg-card lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {links.map((l) => (
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
                    שלום, {displayName}
                  </span>
                </li>
                <li>
                  <Link
                    to="/account"
                    onClick={() => setOpen(false)}
                    className="block border-b border-border/70 py-3 text-base font-semibold text-foreground"
                  >
                    האזור האישי
                  </Link>
                </li>
                {(user.isAdmin || user.isAgent) && (
                  <li>
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block border-b border-border/70 py-3 text-base font-semibold text-foreground"
                    >
                      ניהול האתר
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
                    התנתקות
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
                    אזור אישי
                  </Link>
                </li>
                <li className="py-3">
                  <a
                    href="#sellers"
                    onClick={go("sellers")}
                    className="block rounded-xl bg-sun py-3 text-center text-base font-bold text-sun-foreground"
                  >
                    הערכת שווי חינם
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
