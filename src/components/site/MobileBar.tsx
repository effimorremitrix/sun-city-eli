import { MessageCircle, Phone, Building2 } from "lucide-react";
import { waProps } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { useT } from "@/lib/i18n";

export function MobileBar() {
  const { business } = useLive();
  const t = useT();

  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("properties")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="flex gap-2">
        <a
          {...waProps(`שלום ${business.agentName}, אשמח לקבל פרטים 🙂`, business.phoneTel)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp py-3 text-sm font-bold text-whatsapp-foreground"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          {t.mobileBar.whatsapp}
        </a>
        <a
          href={`tel:${business.phoneTel}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          <Phone className="size-5" aria-hidden="true" />
          {t.mobileBar.call}
        </a>
        <a
          href="#properties"
          onClick={go}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 py-3 text-sm font-bold text-primary"
        >
          <Building2 className="size-5" aria-hidden="true" />
          {t.mobileBar.properties}
        </a>
      </div>
    </div>
  );
}
