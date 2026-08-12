import heroImg from "@/assets/hero-apartment.jpg";
import logo from "@/assets/sun-city-logo.png";
import { useLive } from "@/lib/site-live";

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function Hero() {
  const { business, texts } = useLive();

  return (
    <section id="top">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-10 pb-8 text-center md:pt-14">
        <img
          src={logo}
          alt='לוגו סאן סיטי נדל"ן — שמש כתומה מעל גג בית'
          width={160}
          height={160}
          className="size-24 md:size-32"
        />
        <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-primary md:text-5xl">
          Sun City <span className="text-sun">·</span> {business.name}
        </p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground md:text-base">
          {business.subtitle}
        </p>
      </div>

      <div className="relative isolate">
        <img
          src={heroImg}
          alt="סלון מרווח ומואר בדירה מפוארת עם חלונות גדולים ואור יום"
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[oklch(0.263_0.038_260/0.9)] via-[oklch(0.263_0.038_260/0.72)] to-[oklch(0.263_0.038_260/0.4)]" />

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
              קבלו הערכת שווי חינם
            </a>
            <a
              href="#properties"
              onClick={scrollTo("properties")}
              className="rounded-xl border border-primary-foreground/50 px-6 py-3 text-center text-base font-bold text-primary-foreground"
            >
              לצפייה בנכסים
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2">
            <li>
              <a
                href={business.madlanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-[oklch(1_0_0/0.12)] px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur"
              >
                בין 10 המובילים בנתניה
              </a>
            </li>
            <li>
              <a
                href={business.whatsappGroup.url1}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-[oklch(1_0_0/0.12)] px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur"
              >
                לקבוצת הנכסים בוואטסאפ
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
