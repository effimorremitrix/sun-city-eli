import { DataSource } from "@/components/site/DataSource";
import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, ArrowLeft } from "lucide-react";
import { team, business, waProps } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { useT } from "@/lib/i18n";
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
  const { slug: currentSlug } = useLive();
  const t = useT();
  // בדף אישי מציגים את שאר הסוכנים; בדף הראשי — את כולם
  const dbAgents =
    variant === "secondary" ? agents.filter((a) => a.slug !== currentSlug) : agents;
  // כל עוד רק האתר הראשי קיים במסד, הדף הראשי ממשיך להציג את הצוות הסטטי המלא
  const useDb = variant === "secondary" ? dbAgents.length > 0 : dbAgents.length > 1;

  if (variant === "secondary" && !useDb) return null;

  return (
    <section id="team" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">{t.team.label}</p>
        <h2 className="mt-2 text-3xl md:text-4xl">
          {variant === "secondary" ? t.team.titleOthers : t.team.title}
        </h2>
        <DataSource source={useDb ? "db" : "office"} updatedAt={null} className="mt-2" />
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t.team.subtitle}</p>

        {useDb ? (
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
                          alt={`${name} — ${a.role_title ?? 'יועץ/ת נדל"ן'}`}
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
                      <p className="mt-1 text-sm font-semibold text-sun">
                        {a.role_title ?? 'יועץ/ת נדל"ן'}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <a
                          {...waProps(
                            `שלום ${name}, הגעתי מהאתר של ${business.name} ואשמח לדבר.`,
                            a.phone_tel ?? undefined,
                          )}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
                          aria-label={`שליחת וואטסאפ ל${name}`}
                        >
                          <MessageCircle className="size-4" aria-hidden="true" />
                          {t.team.whatsapp}
                        </a>
                        {a.phone_tel && (
                          <a
                            href={`tel:${a.phone_tel}`}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                            aria-label={`התקשרות ל${name}`}
                          >
                            <Phone className="size-4" aria-hidden="true" />
                            {t.team.call}
                          </a>
                        )}
                      </div>

                      {a.slug !== currentSlug && (
                        <Link
                          to="/$agentSlug"
                          params={{ agentSlug: a.slug }}
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
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <li key={m.name}>
                <Reveal delay={i * 70}>
                  <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
                    {m.image ? (
                      <img
                        src={m.image}
                        alt={`${m.name} — ${m.role}`}
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
                        {initials(m.name)}
                      </div>
                    )}
                    <h3 className="mt-3 text-lg font-extrabold">{m.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-sun">{m.role}</p>

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
                          {t.team.whatsapp}
                        </a>
                        <a
                          href={`tel:${business.phoneTel}`}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
                          aria-label={`התקשרות ל${m.name}`}
                        >
                          <Phone className="size-4" aria-hidden="true" />
                          {t.team.call}
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
                        {t.team.toOffice}
                      </a>
                    )}
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
