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
import { SiteLiveProvider, localizeLive, type LiveSite } from "@/lib/site-live";
import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings, listPublicAgents } from "@/lib/listings.functions";
import { listPublicSoldProperties } from "@/lib/sold.functions";
import { SoldSection } from "@/components/site/SoldSection";
import type { PublicAgentRow } from "@/lib/agents.server";
import type { SoldProperty } from "@/lib/sold.functions";
import { localizeListing, type Listing } from "@/lib/listings";
import { DEFAULT_LOCALE, DICTS, LangProvider, isLocale, useLang, type Locale } from "@/lib/i18n";
import { headForLocale } from "@/lib/i18n/seo";

/** גוזר את שפת העמוד מפרמטר הנתיב האופציונלי {-$lang} */
const langFromParam = (param: string | undefined): Locale =>
  isLocale(param) ? param : DEFAULT_LOCALE;

export const Route = createFileRoute("/{-$lang}/")({
  beforeLoad: ({ params }) => {
    const param = params.lang;
    if (param == null) return;
    // עברית מוגשת רק בנתיב הקנוני "/"
    if (param === "he") throw redirect({ to: "/{-$lang}", params: { lang: undefined } });
    if (!isLocale(param)) throw notFound();
  },
  head: ({ params }) => headForLocale(langFromParam(params.lang)),
  loader: async () => {
    // הדף הראשי מציג את כלל הנכסים והמכירות של כל הסוכנים
    const [live, listings, agents, sold] = await Promise.all([
      getPublicSite(),
      listPublicListings(),
      listPublicAgents(),
      listPublicSoldProperties({ data: {} }),
    ]);
    return { live, listings, agents, sold };
  },
  component: Index,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function RouteError() {
  const params = Route.useParams();
  const t = DICTS[langFromParam(params.lang)];
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">{t.routeErrors.notLoaded}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.routeErrors.tryRefresh}</p>
    </main>
  );
}

function RouteNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">{DICTS.he.routeErrors.notFound}</h1>
    </main>
  );
}

function Index() {
  const params = Route.useParams();
  const lang = langFromParam(params.lang);

  return (
    <LangProvider lang={lang}>
      <IndexContent />
    </LangProvider>
  );
}

function IndexContent() {
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
          <Team agents={agents} />
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
      </div>
    </SiteLiveProvider>
  );
}
