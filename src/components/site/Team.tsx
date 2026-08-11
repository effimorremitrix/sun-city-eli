import { Phone, MessageCircle, MapPin } from "lucide-react";
import { team, business, whatsappLink } from "@/lib/site-data";
import { Reveal } from "./Reveal";

export function Team() {
  return (
    <section id="team" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">אנשים, לא חברה</p>
        <h2 className="mt-2 text-3xl md:text-4xl">הצוות שלנו</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => (
            <li key={m.role}>
              <Reveal delay={i * 70}>
                <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
                  <div
                    className="mx-auto flex size-20 items-center justify-center rounded-full bg-sun/20 text-2xl font-extrabold text-primary"
                    aria-hidden="true"
                  >
                    ★
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">תמונה [להשלמה]</p>
                  <h3 className="mt-3 text-lg">{m.name}</h3>
                  <p className="text-sm font-semibold text-sun">{m.role}</p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4 text-sun" aria-hidden="true" />
                    {m.area}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`tel:${m.phone}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                      aria-label={`התקשרות ל${m.role}`}
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      {m.phone}
                    </a>
                    <a
                      href={whatsappLink(`שלום, אשמח לדבר עם ${m.role} ב${business.name}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-bold text-whatsapp-foreground"
                      aria-label={`וואטסאפ אישי ל${m.role}`}
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
