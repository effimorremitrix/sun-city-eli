import { createFileRoute } from "@tanstack/react-router";
import {
  HomePage,
  HomeError,
  HomeNotFound,
  loadHomeDataOrRedirect,
} from "@/components/site/HomePage";
import { headForLocale } from "@/lib/i18n/seo";

/** הדף הראשי ב-en. ראוט סטטי בכוונה — ראו ההסבר ב-HomePage.tsx */
export const Route = createFileRoute("/en/")({
  head: () => headForLocale("en"),
  loader: () => loadHomeDataOrRedirect("en"),
  component: Homeen,
  errorComponent: () => <HomeError lang="en" />,
  notFoundComponent: () => <HomeNotFound lang="en" />,
});

function Homeen() {
  return <HomePage data={Route.useLoaderData()} lang="en" />;
}
