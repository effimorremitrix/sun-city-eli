import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { TrustStrip } from "@/components/site/TrustStrip";
import { Signature } from "@/components/site/Signature";
import { MenuSection } from "@/components/site/MenuSection";
import { ShabbatOrder } from "@/components/site/ShabbatOrder";
import { Story } from "@/components/site/Story";
import { Contact, Footer } from "@/components/site/Contact";
import { MobileBar } from "@/components/site/MobileBar";

const title = "החצר של אייזיק | אוכל יהודי ביתי בנתניה";
const description =
  "מסעדה משפחתית בנתניה המתמחה בצ'ולנט, קוגל וחמין. הזמנת שבת, איסוף עצמי ואכילה במקום.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "restaurant" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <Signature />
        <MenuSection />
        <ShabbatOrder />
        <Story />
        <Contact />
      </main>
      <Footer />
      <MobileBar />
    </div>
  );
}
