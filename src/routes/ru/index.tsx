import { createFileRoute } from "@tanstack/react-router";
import {
  HomePage,
  HomeError,
  HomeNotFound,
  loadHomeDataOrRedirect,
} from "@/components/site/HomePage";
import { headForLocale } from "@/lib/i18n/seo";

/** הדף הראשי ב-ru. ראוט סטטי בכוונה — ראו ההסבר ב-HomePage.tsx */
export const Route = createFileRoute("/ru/")({
  head: () => headForLocale("ru"),
  loader: () => loadHomeDataOrRedirect("ru"),
  component: Homeru,
  errorComponent: () => <HomeError lang="ru" />,
  notFoundComponent: () => <HomeNotFound lang="ru" />,
});

function Homeru() {
  return <HomePage data={Route.useLoaderData()} lang="ru" />;
}
