import { Phone, MessageCircle, Mail } from "lucide-react";
import { waProps, business as staticBusiness, teamBySlug } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { useLang } from "@/lib/i18n";
import { SocialLinks } from "@/components/site/icons/SocialIcons";
import { Reveal } from "./Reveal";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

/**
 * הפרופיל הראשי של הסוכן — מוצג בראש הדף האישי של כל סוכן,
 * לפני קרוסלת "עוד סוכנים": תמונה גדולה, תפקיד, אודות, יצירת קשר ורשתות.
 */
export function AgentProfile() {
  const { business, slug } = useLive();
  const { t } = useLang();
  const name = business.agentName || business.name;
  // כשלא הועלתה תמונה בניהול — התמונה מהרוסטר של המשרד, כדי שהדף לא יישאר בלי פרצוף
  const photoUrl = business.photoUrl || (slug ? teamBySlug.get(slug)?.image : null) || "";

  return (
    <section className="mx-auto max-w-6xl px-4 pb-4">
      <Reveal>
        <article className="soft-card flex flex-col items-center gap-6 p-6 text-center md:flex-row md:text-start">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={t.team.photoAlt(name, business.roleTitle ?? "")}
              width={180}
              height={180}
              className="size-[180px] shrink-0 rounded-full border-4 border-sun object-cover object-top"
            />
          ) : (
            <div
              className="flex size-[180px] shrink-0 items-center justify-center rounded-full border-4 border-sun bg-sun/20 font-display text-5xl font-extrabold text-primary"
              aria-hidden="true"
            >
              {initials(name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-sun">{t.agentProfile.kicker}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-primary md:text-3xl">{name}</h2>
            {business.roleTitle && (
              <p className="mt-1 text-base font-semibold text-sun">{business.roleTitle}</p>
            )}
            {business.bio && (
              <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{business.bio}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <a
                {...waProps(t.team.waAgent(name, staticBusiness.name), business.phoneTel)}
                className="flex items-center gap-1.5 rounded-xl bg-whatsapp px-5 py-2.5 text-sm font-bold text-whatsapp-foreground"
                aria-label={t.team.waAgentAria(name)}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {t.team.whatsapp}
              </a>
              {business.phoneTel && (
                <a
                  href={`tel:${business.phoneTel}`}
                  className="flex items-center gap-1.5 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary"
                  aria-label={t.team.callAria(name)}
                  dir="ltr"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary underline"
                >
                  <Mail className="size-4 text-sun" aria-hidden="true" />
                  {business.email}
                </a>
              )}
              <SocialLinks />
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}
