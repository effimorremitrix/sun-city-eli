import { createFileRoute, notFound } from "@tanstack/react-router";
import { AgentLandingPage } from "@/components/site/AgentLandingPage";
import { loadLanding } from "@/lib/landing-loader";
import { hreflangLinks } from "@/lib/i18n";
import { RESERVED_AGENT_SLUGS } from "@/lib/reserved-slugs";
import type { LiveSite } from "@/lib/site-live";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";

export const Route = createFileRoute("/ru/$agentSlug")({
  loader: async ({ params }) => {
    const slug = params.agentSlug.toLowerCase();
    if (RESERVED_AGENT_SLUGS.has(slug)) throw notFound();
    const data = await loadLanding(slug, "ru");
    if (!data.live.found) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.live.business.agentName || loaderData?.live.business.name || "";
    const title = `${name} | Sun City Netanya`;
    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { property: "og:type", content: "profile" },
      ],
      links: hreflangLinks(`/ru/${params.agentSlug}`),
    };
  },
  component: Page,
});

function Page() {
  const { live, listings, agents } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
  };
  return (
    <AgentLandingPage live={live} listings={listings} agents={agents} isMainSite={false} />
  );
}
