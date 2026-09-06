import { Link } from "@tanstack/react-router";
import { BellRing, Radar, Save, Settings2, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { useLive } from "@/lib/site-live";
import { trackEvent } from "@/lib/analytics";
import { Reveal } from "./Reveal";

/* ============================================================
 * "הסוכן החכם" — קריאה לפעולה מרכזית: מי שלא מצא נכס מגדיר פעם אחת
 * מה הוא מחפש, והמערכת ממשיכה לחפש עבורו 24/7 (נכסי המשרד + הלוחות)
 * ומתריעה גם ללקוח וגם לסוכן המטפל. המדור המלא מוצג אחרי מדור הנכסים;
 * הבאנר הקומפקטי משולב בתוך מדור הנכסים עצמו.
 * ============================================================ */

const STEP_ICONS = [Settings2, Save, Radar, BellRing, UserRound] as const;

/** יעד הכפתור: אורח → הרשמה/כניסה; משתמש מחובר → ישירות לאזור האישי */
function useAgentCta() {
  const { user } = useAuth();
  const { siteId } = useLive();
  const to = user ? "/account" : "/auth";
  const onClick = () => trackEvent("agent_cta", siteId);
  return { to, onClick } as const;
}

export function SmartAgentSection() {
  const { t } = useLang();
  const { to, onClick } = useAgentCta();
  const s = t.smartAgent;

  return (
    <section id="smart-agent" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-6 md:py-10">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-soft md:p-10">
          {/* קרני שמש רכות ברקע — עיטור בלבד */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-sun/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -start-20 size-64 rounded-full bg-sun/15 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-sun">
                <Sparkles className="size-4" aria-hidden="true" />
                {s.kicker}
              </p>
              <h2 className="mt-2 text-3xl text-primary-foreground md:text-4xl">{s.title}</h2>
              <p className="mt-3 text-base text-primary-foreground/85 md:text-lg">{s.subtitle}</p>

              <Link
                to={to}
                onClick={onClick}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sun px-6 py-4 text-lg font-extrabold text-sun-foreground shadow-soft transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                <BellRing className="size-5" aria-hidden="true" />
                {s.cta}
              </Link>
              <p className="mt-3 text-xs text-primary-foreground/70">{s.note}</p>
            </div>

            <ol className="grid gap-3 sm:grid-cols-2 lg:col-span-3" aria-label={s.stepsTitle}>
              {s.steps.map((step, i) => {
                const Icon = STEP_ICONS[i] ?? Sparkles;
                return (
                  <li
                    key={step}
                    className="flex items-start gap-3 rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sun text-sun-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold leading-snug">
                      <span className="me-1.5 text-sun">{i + 1}.</span>
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** גרסה קומפקטית — שורה אחת + כפתור, לשילוב בתוך מדור הנכסים */
export function SmartAgentBanner({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const { to, onClick } = useAgentCta();
  const s = t.smartAgent;

  return (
    <div
      className={`soft-card flex flex-col items-center gap-3 border border-sun/60 p-4 sm:flex-row sm:justify-between ${className}`}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-primary">
        <Sparkles className="size-4 shrink-0 text-sun" aria-hidden="true" />
        {s.bannerText}
      </p>
      <Link
        to={to}
        onClick={onClick}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground"
      >
        <BellRing className="size-4" aria-hidden="true" />
        {s.bannerCta}
      </Link>
    </div>
  );
}
