import { createFileRoute } from "@tanstack/react-router";
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
import { SITE_CONFIG, properties } from "@/lib/site-data";
import { SiteLiveProvider, type LiveSite } from "@/lib/site-live";
import { getPublicSite } from "@/lib/site.functions";
import { listPublicListings } from "@/lib/listings.functions";
import type { Listing } from "@/lib/listings";


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
      sameAs: [SITE_CONFIG.social.facebook, SITE_CONFIG.social.instagram, SITE_CONFIG.madlanUrl],
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
  }),
  loader: async () => {
    const [live, listings] = await Promise.all([getPublicSite(), listPublicListings()]);
    return { live, listings };
  },
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
  const { live, listings } = Route.useLoaderData() as { live: LiveSite; listings: Listing[] };
  const listingsUpdatedAt = listings.reduce<string | null>(
    (max, l) => (!max || l.updated_at > max ? l.updated_at : max),
    null,
  );

  return (
    <SiteLiveProvider value={live}>
      <div className="min-h-screen">
        <Header />
        <main>
          <Hero />
          <Team />
          <PropertySection listings={listings} updatedAt={listingsUpdatedAt} />
          <ItemsSection />
          <SellerSection />
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
