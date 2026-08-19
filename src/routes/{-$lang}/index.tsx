import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import {
  HomePage,
  HomeError,
  HomeNotFound,
  loadHomeDataOrRedirect,
} from "@/components/site/HomePage";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { headForLocale } from "@/lib/i18n/seo";

/** גוזר את שפת העמוד מפרמטר הנתיב האופציונלי {-$lang} */
const langFromParam = (param: string | undefined): Locale =>
  isLocale(param) ? param : DEFAULT_LOCALE;

/**
 * הדף הראשי בעברית, בנתיב הקנוני "/". שאר השפות מוגשות מראוטים סטטיים
 * (/en, /fr, /ru) — ההסבר למה נמצא ב-HomePage.tsx.
 */
export const Route = createFileRoute("/{-$lang}/")({
  beforeLoad: ({ params }) => {
    const param = params.lang;
    if (param == null) return;
    // עברית מוגשת רק בנתיב הקנוני "/"
    if (param === "he") throw redirect({ to: "/{-$lang}", params: { lang: undefined } });
    if (!isLocale(param)) throw notFound();
  },
  head: ({ params }) => headForLocale(langFromParam(params.lang)),
  loader: ({ params }) => loadHomeDataOrRedirect(langFromParam(params.lang)),
  component: Index,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function Index() {
  const params = Route.useParams();
  return <HomePage data={Route.useLoaderData()} lang={langFromParam(params.lang)} />;
}

function RouteError() {
  const params = Route.useParams();
  return <HomeError lang={langFromParam(params.lang)} />;
}

function RouteNotFound() {
  const params = Route.useParams();
  return <HomeNotFound lang={langFromParam(params.lang)} />;
}
