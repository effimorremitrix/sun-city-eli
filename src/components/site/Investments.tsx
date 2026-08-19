import { BadgeCheck, Calculator, Handshake, Scale, ShieldCheck, Eye, Award } from "lucide-react";
import { business, waProps } from "@/lib/site-data";
import { formatRating, useLang } from "@/lib/i18n";
import { useLive } from "@/lib/site-live";
import { Reveal } from "./Reveal";

const svcIcons = [BadgeCheck, Calculator, Handshake, Scale];
const valIcons = [Award, Eye, ShieldCheck];

export function Services() {
  const { t } = useLang();

  return (
    <section id="services" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.services.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.services.title}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.services.items.map((s, i) => {
          const Icon = svcIcons[i] ?? BadgeCheck;
          return (
            <li key={s.title}>
              <Reveal delay={i * 70}>
                <article className="soft-card flex h-full flex-col p-5 transition-transform hover:-translate-y-1">
                  <Icon className="size-7 text-sun" aria-hidden="true" />
                  <h3 className="mt-3 text-lg">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                  <a
                    {...waProps(t.services.waMsg(business.name, s.title))}
                    className="mt-4 rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground"
                  >
                    {t.services.waBtn}
                  </a>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WhyUs() {
  const { lang, t } = useLang();
  const { business: live } = useLive();

  /* חוות דעת — הנתונים מגיעים מאזור הניהול ומקושרים למקור. */
  const reviewBadges = [
    live.reviewsCount == null ? null : t.whyUs.reviewsBadge(live.reviewsCount),
    live.reviewsRating == null ? null : t.whyUs.ratingBadge(formatRating(live.reviewsRating, lang)),
  ].filter((b): b is string => b !== null);

  return (
    <section id="why" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">{t.whyUs.kicker}</p>
        <h2 className="mt-2 text-3xl md:text-4xl">{t.whyUs.title}</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-foreground">{t.whyUs.about}</p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{t.whyUs.story}</p>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {t.whyUs.values.map((v, i) => {
            const Icon = valIcons[i] ?? Award;
            return (
              <li key={v.title}>
                <Reveal delay={i * 80}>
                  <article className="soft-card h-full p-5 transition-transform hover:-translate-y-1">
                    <Icon className="size-7 text-sun" aria-hidden="true" />
                    <h3 className="mt-3 text-xl">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <ul className="mt-6 flex flex-wrap gap-2">
          {reviewBadges.map((b) => (
            <li key={b}>
              {live.reviewsUrl ? (
                <a
                  href={live.reviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-full bg-card px-4 py-2 text-sm font-bold text-primary underline shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  {b}
                </a>
              ) : (
                <span className="block rounded-full bg-card px-4 py-2 text-sm font-bold text-primary shadow-soft">
                  {b}
                </span>
              )}
            </li>
          ))}
        </ul>

        <a
          href={business.madlanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-navy px-5 py-4 text-sm font-bold text-navy-foreground shadow-soft"
        >
          <Award className="size-5 text-sun" aria-hidden="true" />
          {t.whyUs.badge}
        </a>
      </div>
    </section>
  );
}
