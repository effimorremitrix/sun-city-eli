import { Phone, MessageCircle, User } from "lucide-react";
import { team, business, whatsappLink, agentWhatsappLink } from "@/lib/site-data";
import { Reveal } from "./Reveal";

export function Team() {
  return (
    <section id="team" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">אנשים, לא חברה</p>
        <h2 className="mt-2 text-3xl md:text-4xl">הצוות שלנו</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          בוחרים סוכן, לא חברה. דברו ישירות עם מי שיטפל בכם.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => {
            const hasPhone = /\d/.test(m.phone);
            const telHref = hasPhone ? `tel:${m.phone.replace(/[^\d]/g, "")}` : `tel:${business.phoneTel}`;
            const waHref = hasPhone
              ? agentWhatsappLink(m.phone, `שלום ${m.name}, הגעתי מהאתר של ${business.name} ואשמח לדבר.`)
              : whatsappLink(`שלום, אשמח לדבר עם ${m.name} ב${business.name}.`);

            return (
              <li key={m.name}>
                <Reveal delay={i * 70}>
                  <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
                    <div
                      className="mx-auto flex size-24 items-center justify-center rounded-full bg-sun/20 text-primary"
                      aria-hidden="true"
                    >
                      <User className="size-10" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">תמונה [להשלמה]</p>
                    <h3 className="mt-3 text-lg">{m.name}</h3>
                    <p className="text-sm font-semibold text-sun">{m.role}</p>
                    <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                      {hasPhone ? m.phone : business.phone}
                    </p>

                    <div className="mt-4 flex gap-2">
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                        aria-label={`שליחת וואטסאפ ל${m.name}`}
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        וואטסאפ
                      </a>
                      <a
                        href={telHref}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                        aria-label={`התקשרות ל${m.name}`}
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        התקשרו
                      </a>
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
