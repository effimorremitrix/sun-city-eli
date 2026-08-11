import { MessageCircle, Navigation } from "lucide-react";
import { business, whatsappLink } from "@/lib/business";

export function MobileBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="flex gap-2">
        <a
          href={whatsappLink(`שלום, אני רוצה להזמין מ${business.name} 🙂`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp py-3 text-sm font-bold text-whatsapp-foreground"
        >
          <MessageCircle className="size-5" />
          הזמנה בוואטסאפ
        </a>
        <a
          href={business.wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 py-3 text-sm font-bold text-primary"
        >
          <Navigation className="size-5" />
          ניווט
        </a>
      </div>
    </div>
  );
}
