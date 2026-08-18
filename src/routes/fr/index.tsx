import { createFileRoute } from "@tanstack/react-router";
import { HomePage, HomeError, HomeNotFound, loadHomeData } from "@/components/site/HomePage";
import { headForLocale } from "@/lib/i18n/seo";

/** הדף הראשי ב-fr. ראוט סטטי בכוונה — ראו ההסבר ב-HomePage.tsx */
export const Route = createFileRoute("/fr/")({
  head: () => headForLocale("fr"),
  loader: loadHomeData,
  component: Homefr,
  errorComponent: () => <HomeError lang="fr" />,
  notFoundComponent: () => <HomeNotFound lang="fr" />,
});

function Homefr() {
  return <HomePage data={Route.useLoaderData()} lang="fr" />;
}
