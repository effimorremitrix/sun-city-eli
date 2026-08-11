import { TrendingUp, Building2, Handshake, Scale, Calculator, BadgeCheck } from "lucide-react";
import { investments, services, business, whatsappLink } from "@/lib/site-data";
import { Reveal } from "./Reveal";

const invIcons = [TrendingUp, Building2, Handshake];
const svcIcons = [BadgeCheck, Calculator, Handshake, Scale];

export function Investments() {
  return (
    <section id="investments" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">משקיעים</p>
        <h2 className="mt-2 text-3xl md:text-4xl">השקעות נדל"ן בנתניה</h2>

        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {investments.map((c, i) => {
            const Icon = invIcons[i] ?? TrendingUp;
            return (
              <li key={c.title}>
                <Reveal delay={i * 80}>
                  <article className="soft-card flex h-full flex-col p-5 transition-transform hover:-translate-y-1">
                    <Icon className="size-7 text-sun" aria-hidden="true" />
                    <h3 className="mt-3 text-xl">{c.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                    <a
                      href={whatsappLink(
                        `שלום ${business.name}, אשמח לתאם שיחת ייעוץ בנושא: ${c.title}. שם: `,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground"
                    >
                      לתיאום שיחת ייעוץ
                    </a>
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

export function Services() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">מה אנחנו עושים</p>
      <h2 className="mt-2 text-3xl md:text-4xl">השירותים שלנו</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s, i) => {
          const Icon = svcIcons[i] ?? BadgeCheck;
          return (
            <li key={s.title}>
              <Reveal delay={i * 70}>
                <article className="soft-card h-full p-5 transition-transform hover:-translate-y-1">
                  <Icon className="size-7 text-sun" aria-hidden="true" />
                  <h3 className="mt-3 text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
