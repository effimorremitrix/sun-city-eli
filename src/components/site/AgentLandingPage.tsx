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
import { SiteLiveProvider, type LiveSite } from "@/lib/site-live";
import type { Listing } from "@/lib/listings";
import type { PublicAgentRow } from "@/lib/agents.server";
import type { SoldProperty } from "@/lib/sold.functions";

type Props = {
  live: LiveSite;
  listings: Listing[];
  agents: PublicAgentRow[];
  /** דירות שנמכרו — מדור ההוכחה החברתית */
  sold?: SoldProperty[];
  /** true בדף הראשי (של אלי), false בדף אישי של סוכן */
  isMainSite: boolean;
};

/**
 * גוף דף הנחיתה המשותף: הדף הראשי (/) והדפים האישיים של הסוכנים (/<slug>)
 * מרנדרים את אותו עמוד בדיוק, עם התוכן והפרטים של הסוכן של הדף.
 */
export function AgentLandingPage({ live, listings, agents, sold = [], isMainSite }: Props) {
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
          <Team agents={agents} variant={isMainSite ? "primary" : "secondary"} />
          <PropertySection listings={listings} updatedAt={listingsUpdatedAt} />
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
