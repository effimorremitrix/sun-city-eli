import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Team } from "@/components/site/Team";
import { AgentProfile } from "@/components/site/AgentProfile";
import { PropertySection } from "@/components/site/PropertySection";
import { SellerSection } from "@/components/site/SellerSection";
import { BuyerSection } from "@/components/site/BuyerSection";
import { Services, WhyUs } from "@/components/site/Investments";
import { Testimonials, Faq } from "@/components/site/Testimonials";
import { ContactSection, Footer } from "@/components/site/ContactSection";
import { ItemsSection } from "@/components/site/ItemsSection";
import { MobileBar } from "@/components/site/MobileBar";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { SoldSection } from "@/components/site/SoldSection";
import { SmartAgentSection } from "@/components/site/SmartAgentSection";
import { FieldMoments } from "@/components/site/FieldMoments";
import { attachSiteExtras } from "@/components/site/HomePage";
import type { FieldMediaItem } from "@/lib/field-media.functions";
import { SiteLiveProvider, localizeLive, type LiveSite } from "@/lib/site-live";
import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings, listPublicAgents } from "@/lib/listings.functions";
import { listPublicMarketListings } from "@/lib/market.functions";
import { listPublicSoldProperties, type SoldPage } from "@/lib/sold.functions";
import { localizeListing, type Listing } from "@/lib/listings";
import type { MarketListing } from "@/lib/market";
import { RESERVED_AGENT_SLUGS } from "@/lib/reserved-slugs";
import {
  DEFAULT_LOCALE,
  DICTS,
  LOCALE_META,
  LangProvider,
  isLocale,
  useLang,
  type Locale,
} from "@/lib/i18n";
import { SITE_URL, headForLocale } from "@/lib/i18n/seo";
import { LEGACY_SLUG_REDIRECTS, OFFICE_SLUG } from "@/lib/site-data";
import type { PublicAgentRow } from "@/lib/agents.server";

/** גוזר את שפת העמוד מפרמטר הנתיב האופציונלי {-$lang} */
const langFromParam = (param: string | undefined): Locale =>
  isLocale(param) ? param : DEFAULT_LOCALE;

/**
 * דף אישי של סוכן בכתובת /<slug> (וגם /en/<slug> וכו') — אותו עיצוב של
 * הדף הראשי, עם הפרטים של הסוכן ועם מלאי הנכסים והמכירות המשותף של כל
 * המשרד. כל הפניות מהדף מנותבות לסוכן של הדף, גם על נכס שסוכן אחר העלה.
 */
export const Route = createFileRoute("/{-$lang}/$agentSlug")({
  beforeLoad: ({ params }) => {
    const param = params.lang;
    if (param === "he") {
      throw redirect({
        to: "/{-$lang}/$agentSlug",
        params: { lang: undefined, agentSlug: params.agentSlug },
      });
    }
    if (param != null && !isLocale(param)) throw notFound();

    // כתובת ישנה של דף אישי (למשל /sun-city אחרי המעבר ל-/eli-kalif):
    // הפניה קבועה אל ה-slug הנוכחי, כדי שקישורים ודירוגי חיפוש לא יישברו.
    const legacy = LEGACY_SLUG_REDIRECTS[params.agentSlug.toLowerCase()];
    if (legacy) {
      throw redirect({
        to: "/{-$lang}/$agentSlug",
        params: { lang: param, agentSlug: legacy },
        statusCode: 301,
      });
    }
  },
  loader: async ({ params }) => {
    const slug = params.agentSlug.toLowerCase();
    if (RESERVED_AGENT_SLUGS.has(slug)) throw notFound();

    const [live, listings, agents, sold, marketListings] = await Promise.all([
      getPublicSite({ data: { slug } }),
      listPublicListings({ data: { slug } }),
      listPublicAgents(),
      listPublicSoldProperties({ data: {} }),
      // מודעות מהשוק — כשל בטעינה אינו מפיל את הדף האישי
      listPublicMarketListings({ data: { limit: 200 } }).catch((): MarketListing[] => []),
    ]);
    if (!live.found) throw notFound();
    // ממליצים ו"מהשטח" מהטבלאות — אחרי שה-siteId ידוע, בשפת הדף
    const extras = await attachSiteExtras(live, langFromParam(params.lang));
    return {
      live: extras.live,
      listings,
      agents,
      sold,
      marketListings,
      fieldMedia: extras.fieldMedia,
    };
  },
  head: ({ loaderData, params }) => {
    const lang = langFromParam(params.lang);
    const slug = params.agentSlug.toLowerCase();
    if (slug === OFFICE_SLUG) {
      // כשהדגל homeRedirect דולק /sun-city הוא הכתובת הקנונית; כשכבוי — הקנוני הוא "/"
      return loaderData?.live.settings.homeRedirect
        ? headForLocale(lang, { slug: OFFICE_SLUG })
        : headForLocale(lang);
    }
    const name = loaderData?.live.business.agentName || loaderData?.live.business.name || "";
    const title = `${name} | Sun City Netanya`;
    const self = `${SITE_URL}${lang === "he" ? "" : LOCALE_META[lang].path}/${slug}`;
    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { property: "og:type", content: "profile" },
      ],
      links: [{ rel: "canonical", href: self }],
    };
  },
  component: AgentPage,
  notFoundComponent: RouteNotFound,
});

function RouteNotFound() {
  // שפת ה-404 לפי הסגמנט בכתובת (/en/... וכו') — לא עברית קבועה
  const params = Route.useParams();
  const lang = langFromParam(params.lang);
  return (
    <main dir={lang === "he" ? "rtl" : "ltr"} className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">{DICTS[lang].routeErrors.notFound}</h1>
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
  const { live, listings, agents, sold, marketListings, fieldMedia } = Route.useLoaderData() as {
    live: LiveSite;
    listings: Listing[];
    agents: PublicAgentRow[];
    sold: SoldPage;
    marketListings: MarketListing[];
    fieldMedia: FieldMediaItem[];
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
          {/* הפרופיל של סוכן הדף מוצג כראשי; יתר הסוכנים בקרוסלה מתחתיו */}
          <AgentProfile />
          <Team agents={agents} variant="secondary" />
          <PropertySection
            listings={localizedListings}
            updatedAt={listingsUpdatedAt}
            marketListings={marketListings ?? []}
          />
          <SmartAgentSection />
          <ItemsSection />
          <SellerSection />
          <SoldSection page={sold} />
          <FieldMoments items={fieldMedia ?? []} />
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
