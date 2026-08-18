import heroImg from "@/assets/hero-apartment.jpg";
import logoAsset from "@/assets/sun-city-logo-real.png.asset.json";

const logo = logoAsset.url;
import { SITE_CONFIG } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { useLang } from "@/lib/i18n";

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function Hero() {
  const { business, texts } = useLive();
  const { t } = useLang();

  return (
    <section id="top">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-10 pb-8 text-center md:pt-14">
        <img
          src={logo}
          alt={t.hero.logoAlt}
          width={160}
          height={160}
          className="size-24 md:size-32"
        />
        <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-primary md:text-5xl">
          {business.agentName} <span className="text-sun">·</span> {business.name}
        </p>
        {business.roleTitle && (
          <p className="mt-1 text-sm font-bold text-sun md:text-base">{business.roleTitle}</p>
        )}
        <p className="mt-2 text-sm font-semibold text-muted-foreground md:text-base">
          {business.subtitle}
        </p>
      </div>

      <div className="relative isolate">
        <img
          src={heroImg}
          alt={t.hero.imageAlt}
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover"
        />
        {/* הצד הכהה של הגרדיאנט נשאר תמיד מאחורי הטקסט — לפי כיוון השפה */}
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.263_0.038_260/0.9)] via-[oklch(0.263_0.038_260/0.72)] to-[oklch(0.263_0.038_260/0.4)] rtl:bg-gradient-to-l" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-28">
          <h1 className="max-w-2xl font-display text-3xl font-extrabold text-primary-foreground md:text-5xl">
            {texts.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">
            {texts.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#sellers"
              onClick={scrollTo("sellers")}
              className="rounded-xl bg-sun px-6 py-3 text-center text-base font-bold text-sun-foreground shadow-lift"
            >
              {t.hero.ctaValuation}
            </a>
            <a
              href="#properties"
              onClick={scrollTo("properties")}
              className="rounded-xl border border-primary-foreground/50 px-6 py-3 text-center text-base font-bold text-primary-foreground"
            >
              {t.hero.ctaProperties}
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2">
            <li>
              <a
                href={SITE_CONFIG.madlanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-[oklch(1_0_0/0.12)] px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur"
              >
                {t.hero.badgeTop10}
              </a>
            </li>
            <li>
              <a
                href={SITE_CONFIG.whatsappGroup.url1}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-[oklch(1_0_0/0.12)] px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur"
              >
                {t.hero.badgeGroup}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
