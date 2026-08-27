import { MessageCircle } from "lucide-react";
import { waProps } from "@/lib/site-data";
import { useLang } from "@/lib/i18n";
import { useLive } from "@/lib/site-live";
import { trackEvent } from "@/lib/analytics";

export function FloatingWhatsApp() {
  const { t } = useLang();
  const { business, siteId } = useLive();

  return (
    <a
      {...waProps(t.floatingWa.waMsg(business.agentName), business.phoneTel)}
      onClick={() => trackEvent("whatsapp_click", siteId)}
      aria-label={t.floatingWa.aria}
      className="fixed bottom-24 end-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift transition-transform hover:-translate-y-0.5 lg:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}
