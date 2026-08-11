import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { PropertySection } from "@/components/site/PropertySection";
import { SellerSection } from "@/components/site/SellerSection";
import { BuyerSection } from "@/components/site/BuyerSection";
import { Investments, Services } from "@/components/site/Investments";
import { Team } from "@/components/site/Team";
import { Testimonials, Faq } from "@/components/site/Testimonials";
import { ContactSection, Footer } from "@/components/site/ContactSection";
import { MobileBar } from "@/components/site/MobileBar";
import { AccessibilityWidget } from "@/components/site/AccessibilityWidget";
import { business } from "@/lib/site-data";

const title = 'תיווך נתניה | סאן סיטי נדל"ן — דירות למכירה בנתניה';
const description =
  'משרד תיווך בנתניה: דירות למכירה ולהשכרה, הערכת שווי חינם למוכרים, קבוצת נכסים לקונים וליווי משקיעים. סאן סיטי נדל"ן.';

const schema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: business.name,
  telephone: business.phone,
  email: business.email,
  areaServed: "נתניה",
  address: {
    "@type": "PostalAddress",
    streetAddress: "שמואל הנציב 20",
    addressLocality: "נתניה",
    addressCountry: "IL",
  },
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
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <PropertySection />
        <SellerSection />
        <BuyerSection />
        <Investments />
        <Services />
        <Team />
        <Testimonials />
        <Faq />
        <ContactSection />
      </main>
      <Footer />
      <MobileBar />
      <AccessibilityWidget />
    </div>
  );
}
