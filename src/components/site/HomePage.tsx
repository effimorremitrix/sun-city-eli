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
import { SoldSection } from "@/components/site/SoldSection";
import { SiteLiveProvider, localizeLive, type LiveSite } from "@/lib/site-live";
import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings, listPublicAgents } from "@/lib/listings.functions";
import { listPublicSoldProperties, type SoldProperty } from "@/lib/sold.functions";
import { localizeListing, type Listing } from "@/lib/listings";
import { DICTS, LangProvider, useLang, type Locale } from "@/lib/i18n";
import { headForLocale } from "@/lib/i18n/seo";
import type { PublicAgentRow } from "@/lib/agents.server";

/* ============================================================
 * הדף הראשי, משותף לכל השפות.
 *
 * עברית מוגשת מ-"/" דרך הסגמנט האופציונלי {-$lang}, ואילו /en, /fr ו-/ru
 * הם ראוטים סטטיים משלהם. הסיבה: כתובת בעלת סגמנט אחד נתפסת תמיד על ידי
 * "/{-$lang}/$agentSlug" (הדף האישי של סוכן), שגובר בדירוג על ראוט האינדקס
 * עם פרמטר אופציונלי — ולכן /en נקרא כ-slug של סוכן והחזיר 404. ראוט סטטי
 * גובר על פרמטר דינמי, וכך כל שפה מקבלת את הדף הראשי שלה.
 * ============================================================ */

export type HomeData = {
  live: LiveSite;
  listings: Listing[];
  agents: PublicAgentRow[];
  sold: SoldProperty[];
};

/** נתוני הדף הראשי — כלל הנכסים, הסוכנים והמכירות של כל הסוכנים */
export async function loadHomeData(): Promise<HomeData> {
  const [live, listings, agents, sold] = await Promise.all([
    getPublicSite(),
    listPublicListings(),
    listPublicAgents(),
    listPublicSoldProperties({ data: {} }),
  ]);
  return { live, listings, agents, sold };
}

export function HomePage({ data, lang }: { data: HomeData; lang: Locale }) {
  return (
    <LangProvider lang={lang}>
      <HomeContent data={data} />
    </LangProvider>
  );
}

function HomeContent({ data }: { data: HomeData }) {
  const { lang, t } = useLang();
  const { live, listings, agents, sold } = data;
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

export function HomeError({ lang }: { lang: Locale }) {
  const t = DICTS[lang];
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">{t.routeErrors.notLoaded}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.routeErrors.tryRefresh}</p>
    </main>
  );
}

export function HomeNotFound({ lang }: { lang: Locale }) {
  const t = DICTS[lang];
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">{t.routeErrors.notFound}</h1>
    </main>
  );
}
