import { MessageCircle } from "lucide-react";
import { business, waProps } from "@/lib/site-data";
import { useLang } from "@/lib/i18n";

export function FloatingWhatsApp() {
  const { t } = useLang();

  return (
    <a
      {...waProps(t.floatingWa.waMsg(business.name))}
      aria-label={t.floatingWa.aria}
      className="fixed bottom-24 end-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift transition-transform hover:-translate-y-0.5 lg:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}
