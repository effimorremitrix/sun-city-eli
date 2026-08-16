import { createFileRoute } from "@tanstack/react-router";
import { AgentLandingPage } from "@/components/site/AgentLandingPage";
import { loadLanding } from "@/lib/landing-loader";
import { hreflangLinks } from "@/lib/i18n";
import type { LiveSite } from "@/lib/site-live";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";
import type { SoldProperty } from "@/lib/sold.functions";

const title = "Недвижимость в Нетании | Sun City — квартиры на продажу и аренду";
const description =
  "Агентство Sun City, Нетания: квартиры на продажу и аренду, бесплатная оценка для продавцов, группа объектов для покупателей и личное сопровождение до сделки.";

export const Route = createFileRoute("/ru/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: hreflangLinks("/ru"),
  }),
  loader: () => loadLanding(null, "ru"),
  component: Page,
});

function Page() {
  const { live, listings, agents, sold } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
    sold: SoldProperty[];
  };
  return (
    <AgentLandingPage live={live} listings={listings} agents={agents} sold={sold} isMainSite />
  );
}
