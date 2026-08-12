import { MessageCircle } from "lucide-react";
import { business, whatsappLink } from "@/lib/site-data";

export function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink(`שלום ${business.name}, הגעתי מהאתר ואשמח לקבל פרטים 🙂`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="שליחת הודעת וואטסאפ למשרד"
      className="fixed bottom-24 left-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift transition-transform hover:-translate-y-0.5 lg:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}
