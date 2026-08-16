import { createFileRoute } from "@tanstack/react-router";
import { AgentLandingPage } from "@/components/site/AgentLandingPage";
import { loadLanding } from "@/lib/landing-loader";
import { hreflangLinks } from "@/lib/i18n";
import type { LiveSite } from "@/lib/site-live";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";

const title = "Immobilier à Netanya | Sun City — Appartements à vendre et à louer";
const description =
  "Sun City Immobilier, Netanya : appartements à vendre et à louer, estimation gratuite pour les vendeurs, groupe de biens pour les acheteurs et accompagnement personnel jusqu'à la signature.";

export const Route = createFileRoute("/fr/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: hreflangLinks("/fr"),
  }),
  loader: () => loadLanding(null, "fr"),
  component: Page,
});

function Page() {
  const { live, listings, agents } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
  };
  return <AgentLandingPage live={live} listings={listings} agents={agents} isMainSite />;
}
