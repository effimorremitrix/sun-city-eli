import { Phone, MessageCircle } from "lucide-react";
import { team, business, waProps } from "@/lib/site-data";
import { Reveal } from "./Reveal";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

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
          {team.map((m, i) => (
            <li key={m.name}>
              <Reveal delay={i * 70}>
                <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
                  {m.image ? (
                    <img
                      src={m.image}
                      alt={`${m.name} — ${m.role}`}
                      width={160}
                      height={160}
                      loading="lazy"
                      className="mx-auto size-28 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="mx-auto flex size-28 items-center justify-center rounded-full bg-sun/20 font-display text-2xl font-extrabold text-primary"
                      aria-hidden="true"
                    >
                      {initials(m.name)}
                    </div>
                  )}
                  <h3 className="mt-3 text-lg">{m.name}</h3>
                  <p className="text-sm font-semibold text-sun">{m.role}</p>

                  {m.phone ? (
                    <div className="mt-4 flex gap-2">
                      <a
                        {...waProps(
                          `שלום ${m.name}, הגעתי מהאתר של ${business.name} ואשמח לדבר.`,
                        )}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                        aria-label={`שליחת וואטסאפ ל${m.name}`}
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        וואטסאפ
                      </a>
                      <a
                        href={`tel:${business.phoneTel}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                        aria-label={`התקשרות ל${m.name}`}
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        התקשרו
                      </a>
                    </div>
                  ) : (
                    <a
                      {...waProps(
                        `שלום ${business.name}, אשמח לפנייה למשרד בנוגע ל${m.name}.`,
                      )}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                      aria-label={`לפנייה למשרד בנוגע ל${m.name}`}
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      לפנייה למשרד
                    </a>
                  )}
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
