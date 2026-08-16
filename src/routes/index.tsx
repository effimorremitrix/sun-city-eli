import { createFileRoute } from "@tanstack/react-router";
import { AgentLandingPage } from "@/components/site/AgentLandingPage";
import { SITE_CONFIG, properties } from "@/lib/site-data";
import type { LiveSite } from "@/lib/site-live";
import { loadLanding } from "@/lib/landing-loader";
import { hreflangLinks } from "@/lib/i18n";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";


const title = 'תיווך נתניה | סאן סיטי נדל"ן — דירות למכירה בנתניה';
const description =
  'סאן סיטי נדל"ן, תיווך בנתניה: דירות למכירה בנתניה ולהשכרה, הערכת שווי חינם למוכרים, קבוצת נכסים לקונים וליווי אישי עד סגירת העסקה.';

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      name: SITE_CONFIG.name,
      telephone: SITE_CONFIG.phone,
      email: SITE_CONFIG.email,
      areaServed: "נתניה",
      sameAs: [
        SITE_CONFIG.social.facebook,
        SITE_CONFIG.social.instagram,
        SITE_CONFIG.social.tiktok,
        SITE_CONFIG.madlanUrl,
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "שמואל הנציב 20",
        addressLocality: "נתניה",
        addressCountry: "IL",
      },
    },
    ...properties.map((p) => ({
      "@type": "Residence",
      name: p.title,
      description: p.description,
      numberOfRooms: p.rooms,
      floorSize: { "@type": "QuantitativeValue", value: p.size, unitCode: "MTK" },
      address: {
        "@type": "PostalAddress",
        streetAddress: p.neighborhood,
        addressLocality: "נתניה",
        addressCountry: "IL",
      },
    })),
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
    links: hreflangLinks("/"),
  }),
  // הדף הראשי מציג את כלל הנכסים של כל הסוכנים; כל פנייה על נכס מנותבת לסוכן שלו
  loader: () => loadLanding(null, "he"),
  component: Index,
  errorComponent: () => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">העמוד לא נטען</h1>
      <p className="mt-2 text-sm text-muted-foreground">נסו לרענן את העמוד.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">העמוד לא נמצא</h1>
    </main>
  ),
});

function Index() {
  const { live, listings, agents } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
  };
  return <AgentLandingPage live={live} listings={listings} agents={agents} isMainSite />;
}
