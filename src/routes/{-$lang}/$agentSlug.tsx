import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Team } from "@/components/site/Team";
import { PropertySection } from "@/components/site/PropertySection";
import { SellerSection } from "@/components/site/SellerSection";
import { BuyerSection } from "@/components/site/BuyerSection";
import { Services, WhyUs } from "@/components/site/Investments";
import { Testimonials, Faq } from "@/components/site/Testimonials";
import { ContactSection, Footer } from "@/components/site/ContactSection";
import { ItemsSection } from "@/components/site/ItemsSection";
import { MobileBar } from "@/components/site/MobileBar";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { SoldSection } from "@/components/site/SoldSection";
import { SiteLiveProvider, localizeLive, type LiveSite } from "@/lib/site-live";
import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings, listPublicAgents } from "@/lib/listings.functions";
import { listPublicSoldProperties, type SoldProperty } from "@/lib/sold.functions";
import { localizeListing, type Listing } from "@/lib/listings";
import { RESERVED_AGENT_SLUGS } from "@/lib/reserved-slugs";
import { DEFAULT_LOCALE, DICTS, LangProvider, isLocale, useLang, type Locale } from "@/lib/i18n";
import type { PublicAgentRow } from "@/lib/agents.server";

/** גוזר את שפת העמוד מפרמטר הנתיב האופציונלי {-$lang} */
const langFromParam = (param: string | undefined): Locale =>
  isLocale(param) ? param : DEFAULT_LOCALE;

/**
 * דף אישי של סוכן בכתובת /<slug> (וגם /en/<slug> וכו') — אותו עיצוב של
 * הדף הראשי, עם הפרטים, הנכסים והמכירות של הסוכן בלבד.
 */
export const Route = createFileRoute("/{-$lang}/$agentSlug")({
  beforeLoad: ({ params }) => {
    const param = params.lang;
    if (param == null) return;
    if (param === "he") {
      throw redirect({
        to: "/{-$lang}/$agentSlug",
        params: { lang: undefined, agentSlug: params.agentSlug },
      });
    }
    if (!isLocale(param)) throw notFound();
  },
  loader: async ({ params }) => {
    const slug = params.agentSlug.toLowerCase();
    if (RESERVED_AGENT_SLUGS.has(slug)) throw notFound();

    const [live, listings, agents, sold] = await Promise.all([
      getPublicSite({ data: { slug } }),
      listPublicListings({ data: { slug } }),
      listPublicAgents(),
      listPublicSoldProperties({ data: { slug } }),
    ]);
    if (!live.found) throw notFound();
    return { live, listings, agents, sold };
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
    };
  },
  component: AgentPage,
  notFoundComponent: RouteNotFound,
});

function RouteNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">{DICTS.he.routeErrors.notFound}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <a href="/" className="underline">
          Sun City
        </a>
      </p>
    </main>
  );
}

function AgentPage() {
  const params = Route.useParams();
  const lang = langFromParam(params.lang);

  return (
    <LangProvider lang={lang}>
      <AgentPageContent />
    </LangProvider>
  );
}

function AgentPageContent() {
  const { lang, t } = useLang();
  const { live, listings, agents, sold } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
    sold: SoldProperty[];
  };
  const localizedLive = localizeLive(live, lang, t);
  const localizedListings = listings.map((l) => localizeListing(l, lang));
  const listingsUpdatedAt = listings.reduce<string | null>(
    (max, l) => (!max || l.updated_at > max ? l.updated_at : max),
    null,
  );

  return (
    <SiteLiveProvider value={localizedLive}>
      <div className="min-h-screen">
        <Header />
        <main>
          <Hero />
          <Team agents={agents} variant="secondary" />
          <PropertySection listings={localizedListings} updatedAt={listingsUpdatedAt} />
          <ItemsSection />
          <SellerSection />
          <SoldSection items={sold} />
          <BuyerSection />
          <Services />
          <WhyUs />
          <Testimonials />
          <Faq />
          <ContactSection />
        </main>
        <Footer />
        <MobileBar />
        <FloatingWhatsApp />
        <AccessibilityWidget />
      </div>
    </SiteLiveProvider>
  );
}
