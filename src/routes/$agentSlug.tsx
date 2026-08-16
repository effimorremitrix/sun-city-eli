import { createFileRoute, notFound } from "@tanstack/react-router";
import { AgentLandingPage } from "@/components/site/AgentLandingPage";
import { loadLanding } from "@/lib/landing-loader";
import { hreflangLinks } from "@/lib/i18n";
import { RESERVED_AGENT_SLUGS } from "@/lib/reserved-slugs";
import type { LiveSite } from "@/lib/site-live";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";

/**
 * דף אישי של סוכן בכתובת /<slug> — אותו עיצוב של הדף הראשי, עם הפרטים
 * והנכסים של הסוכן. ראוטים סטטיים (auth, admin וכו') קודמים לראוט הדינמי,
 * והרשימה כאן היא הגנה נוספת.
 */

export const Route = createFileRoute("/$agentSlug")({
  loader: async ({ params }) => {
    const slug = params.agentSlug.toLowerCase();
    if (RESERVED_AGENT_SLUGS.has(slug)) throw notFound();
    const data = await loadLanding(slug, "he");
    if (!data.live.found) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.live.business.agentName || loaderData?.live.business.name || "";
    const title = `${name} | סאן סיטי נדל"ן — תיווך בנתניה`;
    const description = `הדף האישי של ${name} מסאן סיטי נדל"ן: נכסים למכירה ולהשכרה בנתניה, ליווי אישי והערכת שווי חינם.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
      links: hreflangLinks(`/${params.agentSlug}`),
    };
  },
  component: AgentPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">הדף לא נמצא</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        לא קיים סוכן בכתובת הזו.{" "}
        <a href="/" className="underline">
          לדף הראשי
        </a>
      </p>
    </main>
  ),
});

function AgentPage() {
  const { live, listings, agents } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
  };
  return <AgentLandingPage live={live} listings={listings} agents={agents} isMainSite={false} />;
}
