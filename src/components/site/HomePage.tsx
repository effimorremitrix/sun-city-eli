import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
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
import { redirect } from "@tanstack/react-router";
import { SiteLiveProvider, localizeLive, type LiveSite } from "@/lib/site-live";
import { OFFICE_SLUG } from "@/lib/site-data";
import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings } from "@/lib/listings.functions";
import { listPublicMarketListings } from "@/lib/market.functions";
import { listPublicSoldProperties, type SoldPage } from "@/lib/sold.functions";
import { localizeListing, type Listing } from "@/lib/listings";
import type { MarketListing } from "@/lib/market";
import { DICTS, LangProvider, useLang, type Locale } from "@/lib/i18n";
import { headForLocale } from "@/lib/i18n/seo";

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
  sold: SoldPage;
  /** מודעות פעילות מהשוק (לוחות אחרים) — כשל בטעינה אינו מפיל את הדף */
  marketListings: MarketListing[];
};

/**
 * נתוני הדף הראשי — כלל הנכסים והמכירות של כל הסוכנים. רשימת הסוכנים אינה
 * נטענת כאן: מדור הצוות מוצג רק בדפים האישיים, והדף הראשי לא זקוק לה.
 */
export async function loadHomeData(): Promise<HomeData> {
  const [live, listings, sold, marketListings] = await Promise.all([
    getPublicSite(),
    listPublicListings(),
    listPublicSoldProperties({ data: {} }),
    listPublicMarketListings({ data: { limit: 200 } }).catch((): MarketListing[] => []),
  ]);
  return { live, listings, sold, marketListings };
}

/** נתוני הדף הראשי — או הפניה קבועה (301) אל /sun-city כשהדגל homeRedirect דולק */
export async function loadHomeDataOrRedirect(lang: Locale): Promise<HomeData> {
  const data = await loadHomeData();
  if (data.live.settings.homeRedirect) {
    throw redirect({
      to: "/{-$lang}/$agentSlug",
      params: { lang: lang === "he" ? undefined : lang, agentSlug: OFFICE_SLUG },
      statusCode: 301,
    });
  }
  return data;
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
  const { live, listings, sold, marketListings } = data;
  // isHome: מסמן לתפריט, לפוטר ולמדורים שזהו הדומיין הראשי — שם מדור הצוות
  // לא מוצג כלל. בדפים האישיים של הסוכנים הוא נשאר.
  const localizedLive = { ...localizeLive(live, lang, t), isHome: true };
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
          <PropertySection
            listings={localizedListings}
            updatedAt={listingsUpdatedAt}
            marketListings={marketListings ?? []}
          />
          <ItemsSection />
          <SellerSection />
          <SoldSection page={sold} />
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
