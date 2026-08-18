import { DataSource } from "@/components/site/DataSource";
import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, ArrowLeft } from "lucide-react";
import { team, business, waProps } from "@/lib/site-data";
import { useLang } from "@/lib/i18n";
import { useLive } from "@/lib/site-live";
import type { PublicAgentRow } from "@/lib/agents.server";
import { Reveal } from "./Reveal";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

type Props = {
  /** הסוכנים הפעילים מהמסד — כל כרטיס מקשר לדף האישי של הסוכן */
  agents?: PublicAgentRow[];
  /** primary — הצוות המלא (הדף הראשי); secondary — "עוד סוכנים" בדף אישי */
  variant?: "primary" | "secondary";
};

export function Team({ agents = [], variant = "primary" }: Props) {
  const { t } = useLang();
  const { slug: currentSlug } = useLive();

  // בדף אישי מציגים את שאר הסוכנים; בדף הראשי — את כולם.
  // כל עוד רק האתר הראשי קיים במסד, הדף הראשי ממשיך להציג את הצוות הסטטי.
  const dbAgents = variant === "secondary" ? agents.filter((a) => a.slug !== currentSlug) : agents;
  const useDb = variant === "secondary" ? dbAgents.length > 0 : dbAgents.length > 1;

  if (variant === "secondary" && !useDb) return null;

  if (useDb) {
    return (
      <section id="team" className="bg-secondary py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-bold text-sun">{t.team.kicker}</p>
          <h2 className="mt-2 text-3xl md:text-4xl">
            {variant === "secondary" ? t.team.othersTitle : t.team.title}
          </h2>
          <DataSource source="db" updatedAt={null} className="mt-2" />
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t.team.subtitle}</p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dbAgents.map((a, i) => {
              const name = a.agent_name || a.name;
              return (
                <li key={a.id}>
                  <Reveal delay={i * 70}>
                    <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
                      {a.photo_url ? (
                        <img
                          src={a.photo_url}
                          alt={t.team.photoAlt(name, a.role_title ?? "")}
                          width={140}
                          height={140}
                          loading="lazy"
                          className="mx-auto size-[140px] rounded-full border-2 border-sun object-cover object-top"
                        />
                      ) : (
                        <div
                          className="mx-auto flex size-[140px] items-center justify-center rounded-full border-2 border-sun bg-sun/20 font-display text-3xl font-extrabold text-primary"
                          aria-hidden="true"
                        >
                          {initials(name)}
                        </div>
                      )}
                      <h3 className="mt-3 text-lg font-extrabold">{name}</h3>
                      {a.role_title && (
                        <p className="mt-1 text-sm font-semibold text-sun">{a.role_title}</p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <a
                          {...waProps(
                            t.team.waAgent(name, business.name),
                            a.phone_tel ?? undefined,
                          )}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                          aria-label={t.team.waAgentAria(name)}
                        >
                          <MessageCircle className="size-4" aria-hidden="true" />
                          {t.team.whatsapp}
                        </a>
                        {a.phone_tel && (
                          <a
                            href={`tel:${a.phone_tel}`}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                            aria-label={t.team.callAria(name)}
                          >
                            <Phone className="size-4" aria-hidden="true" />
                            {t.team.call}
                          </a>
                        )}
                      </div>

                      {a.slug !== currentSlug && (
                        <Link
                          to="/{-$lang}/$agentSlug"
                          params={{ lang: undefined, agentSlug: a.slug }}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary underline"
                        >
                          {t.team.toPersonalPage(name)}
                          <ArrowLeft className="size-4" aria-hidden="true" />
                        </Link>
                      )}
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

  return (
    <section id="team" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">{t.team.kicker}</p>
        <h2 className="mt-2 text-3xl md:text-4xl">{t.team.title}</h2>
        <DataSource source="office" updatedAt={null} className="mt-2" />
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t.team.subtitle}</p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => {
            const name = t.team.names[m.name] ?? m.name;
            const role = t.team.roles[m.name] ?? m.role;
            return (
              <li key={m.name}>
                <Reveal delay={i * 70}>
                  <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
                    {m.image ? (
                      <img
                        src={m.image}
                        alt={t.team.photoAlt(name, role)}
                        width={140}
                        height={140}
                        loading="lazy"
                        className="mx-auto size-[140px] rounded-full border-2 border-sun object-cover object-top"
                      />
                    ) : (
                      <div
                        className="mx-auto flex size-[140px] items-center justify-center rounded-full border-2 border-sun bg-sun/20 font-display text-3xl font-extrabold text-primary"
                        aria-hidden="true"
                      >
                        {initials(name)}
                      </div>
                    )}
                    <h3 className="mt-3 text-lg font-extrabold">{name}</h3>
                    <p className="mt-1 text-sm font-semibold text-sun">{role}</p>

                    {m.phone ? (
                      <div className="mt-4 flex gap-2">
                        <a
                          {...waProps(t.team.waAgent(name, business.name))}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                          aria-label={t.team.waAgentAria(name)}
                        >
                          <MessageCircle className="size-4" aria-hidden="true" />
                          {t.team.whatsapp}
                        </a>
                        <a
                          href={`tel:${business.phoneTel}`}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                          aria-label={t.team.callAria(name)}
                        >
                          <Phone className="size-4" aria-hidden="true" />
                          {t.team.call}
                        </a>
                      </div>
                    ) : (
                      <a
                        {...waProps(t.team.waOffice(business.name, name))}
                        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                        aria-label={t.team.officeAria(name)}
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        {t.team.contactOffice}
                      </a>
                    )}
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
