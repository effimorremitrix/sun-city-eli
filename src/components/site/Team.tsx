import { Phone, MessageCircle } from "lucide-react";
import { team, business, waProps } from "@/lib/site-data";
import { useLang } from "@/lib/i18n";
import { useLive } from "@/lib/site-live";
import type { PublicAgentRow } from "@/lib/agents.server";
import { Reveal } from "./Reveal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

/** כרטיס מוכן לתצוגה — תוצאת המיזוג בין הרוסטר של המשרד לרשומות המסד */
type TeamCard = {
  slug: string;
  name: string;
  role: string;
  photo: string | null;
  /** מספר אישי לפנייה ישירה; null — הפנייה מנותבת למשרד */
  phoneTel: string | null;
};

export function Team({ agents = [], variant = "primary" }: Props) {
  const { t, dir } = useLang();
  const { slug: currentSlug } = useLive();

  /* הרוסטר של המשרד הוא השלד, ורשומות המסד מעשירות אותו ומוסיפות לו סוכנים
   * חדשים — מיזוג ולא החלפה. כך הוספת סוכן במסד לא מעלימה את שאר הצוות. */
  const bySlug = new Map(agents.map((a) => [a.slug, a]));
  const cards: TeamCard[] = team.map((m) => {
    const db = bySlug.get(m.slug);
    return {
      slug: m.slug,
      name: t.team.names[m.name] ?? m.name,
      role: db?.role_title || t.team.roles[m.name] || m.role,
      photo: db?.photo_url || m.image || null,
      phoneTel: db?.phone_tel || (m.phone ? business.phoneTel : null),
    };
  });

  // סוכנים שנוספו במסד ואינם ברוסטר — נכנסים בסוף הרשימה מאליהם
  const rosterSlugs = new Set(team.map((m) => m.slug));
  for (const a of agents) {
    if (rosterSlugs.has(a.slug)) continue;
    const name = a.agent_name || a.name;
    cards.push({
      slug: a.slug,
      name: t.team.names[name] ?? name,
      role: a.role_title ?? "",
      photo: a.photo_url || null,
      phoneTel: a.phone_tel || null,
    });
  }

  // בדף אישי מציגים את שאר הסוכנים; בדף הראשי — את כולם
  const shown = variant === "secondary" ? cards.filter((c) => c.slug !== currentSlug) : cards;
  if (!shown.length) return null;

  const agentCard = (c: TeamCard) => (
    <article className="soft-card h-full p-5 text-center transition-transform hover:-translate-y-1">
      {c.photo ? (
        <img
          src={c.photo}
          alt={t.team.photoAlt(c.name, c.role)}
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
          {initials(c.name)}
        </div>
      )}
      <h3 className="mt-3 text-lg font-extrabold">{c.name}</h3>
      {c.role && <p className="mt-1 text-sm font-semibold text-sun">{c.role}</p>}

      {/* בדף אישי (הקרוסלה) הכרטיס תצוגתי בלבד — בלי קישורי פנייה, כדי שלא
       * להסיט פניות מסוכן הדף. כפתורי הקשר מוצגים רק בדף הראשי. */}
      {variant !== "primary" ? null : c.phoneTel ? (
        <div className="mt-4 flex gap-2">
          <a
            {...waProps(t.team.waAgent(c.name, business.name), c.phoneTel)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
            aria-label={t.team.waAgentAria(c.name)}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t.team.whatsapp}
          </a>
          <a
            href={`tel:${c.phoneTel}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
            aria-label={t.team.callAria(c.name)}
          >
            <Phone className="size-4" aria-hidden="true" />
            {t.team.call}
          </a>
        </div>
      ) : (
        <a
          {...waProps(t.team.waOffice(business.name, c.name))}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
          aria-label={t.team.officeAria(c.name)}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          {t.team.contactOffice}
        </a>
      )}
    </article>
  );

  return (
    <section id="team" className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">{t.team.kicker}</p>
        <h2 className="mt-2 text-3xl md:text-4xl">
          {variant === "secondary" ? t.team.othersTitle : t.team.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t.team.subtitle}</p>

        {variant === "secondary" ? (
          /* בדף אישי: יתר הסוכנים מוצגים בקרוסלה */
          <Carousel
            className="mt-6"
            opts={{
              direction: dir === "rtl" ? "rtl" : "ltr",
              align: "start",
              loop: shown.length > 3,
            }}
            dir={dir}
          >
            <CarouselContent>
              {shown.map((c) => (
                <CarouselItem key={c.slug} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  {agentCard(c)}
                </CarouselItem>
              ))}
            </CarouselContent>
            {shown.length > 1 && (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            )}
          </Carousel>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c, i) => (
              <li key={c.slug}>
                <Reveal delay={i * 70} className="h-full">
                  {agentCard(c)}
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
