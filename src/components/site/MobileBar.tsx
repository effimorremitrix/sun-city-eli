import { MessageCircle, Phone, Building2 } from "lucide-react";
import { business, buildWa } from "@/lib/site-data";

export function MobileBar() {
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("properties")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="flex gap-2">
        <a
          href={buildWa(`שלום ${business.name}, אשמח לקבל פרטים 🙂`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp py-3 text-sm font-bold text-whatsapp-foreground"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          וואטסאפ
        </a>
        <a
          href={`tel:${business.phoneTel}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          <Phone className="size-5" aria-hidden="true" />
          התקשרו
        </a>
        <a
          href="#properties"
          onClick={go}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 py-3 text-sm font-bold text-primary"
        >
          <Building2 className="size-5" aria-hidden="true" />
          נכסים
        </a>
      </div>
    </div>
  );
}
