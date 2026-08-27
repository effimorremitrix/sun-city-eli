import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import leafletCss from "leaflet/dist/leaflet.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { DEFAULT_LOCALE, DICTS, dirFor, isLocale, type Locale } from "../lib/i18n";

/** שפת דפי השגיאה — מהסגמנט הראשון בכתובת (כמו RootShell); בלי קידומת = עברית */
function useErrorPageLang(): Locale {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

function NotFoundComponent() {
  const lang = useErrorPageLang();
  const t = DICTS[lang];
  return (
    <div
      dir={dirFor(lang)}
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t.routeErrors.notFound}</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sun City
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const lang = useErrorPageLang();
  const t = DICTS[lang];
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div
      dir={dirFor(lang)}
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t.routeErrors.notLoaded}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.routeErrors.tryRefresh}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ↻
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sun City
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: 'סאן סיטי נדל"ן' },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&family=Assistant:wght@400;500;600;700&family=Rubik:wght@400;500;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      // סגנונות Leaflet — נדרשים לפריסת האריחים והנעצים במפת הנכסים
      {
        rel: "stylesheet",
        href: leafletCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // שפת העמוד נגזרת מהסגמנט הראשון בכתובת, כדי לכסות גם את הראוטים הסטטיים
  // (/en, /fr, /ru) וגם את הסגמנט האופציונלי {-$lang} של דפי הסוכנים.
  // כתובות בלי קידומת שפה (אדמין, אזור אישי, auth) נשארות בעברית RTL.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = pathname.split("/")[1];
  const lang = isLocale(first) ? first : DEFAULT_LOCALE;

  return (
    <html lang={lang} dir={dirFor(lang)}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
