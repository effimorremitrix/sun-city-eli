import { MessageCircle } from "lucide-react";
import { waProps } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";

export function FloatingWhatsApp() {
  const { business } = useLive();

  return (
    <a
      {...waProps(
        `שלום ${business.agentName}, הגעתי מהאתר ואשמח לקבל פרטים 🙂`,
        business.phoneTel,
      )}
      aria-label={`שליחת הודעת וואטסאפ ל${business.agentName}`}
      className="fixed bottom-24 left-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift transition-transform hover:-translate-y-0.5 lg:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}
