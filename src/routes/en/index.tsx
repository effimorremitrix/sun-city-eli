import { createFileRoute } from "@tanstack/react-router";
import { AgentLandingPage } from "@/components/site/AgentLandingPage";
import { loadLanding } from "@/lib/landing-loader";
import { hreflangLinks } from "@/lib/i18n";
import type { LiveSite } from "@/lib/site-live";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";

const title = 'Real Estate in Netanya | Sun City — Apartments for Sale & Rent';
const description = "Sun City Real Estate, Netanya: apartments for sale and rent, free valuation for sellers, a buyers' property group and personal guidance to closing.";

export const Route = createFileRoute("/en/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: hreflangLinks("/en"),
  }),
  loader: () => loadLanding(null, "en"),
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
