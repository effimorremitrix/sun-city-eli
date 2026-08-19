import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import heroImg from "@/assets/hero-apartment.jpg";
import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import logo from "@/assets/sun-city-logo-full.svg";
import { SITE_CONFIG } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { useLang } from "@/lib/i18n";
import { isVideoUrl } from "@/lib/media";

/** תמונות ברירת המחדל של הסליידר — עד שמעלים תמונות משלכם באזור הניהול */
const DEFAULT_SLIDES = [heroImg, prop1, prop2, prop3, prop4];

const AUTOPLAY_MS = 6000;

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function Hero() {
  const { business, texts } = useLive();
  const { dir, t } = useLang();

  const slides = business.heroImages?.length ? business.heroImages : DEFAULT_SLIDES;
  const [emblaRef, embla] = useEmblaCarousel({
    loop: true,
    direction: dir,
    // שקופית אחת — אין מה לגלול, ומשאירים את הקרוסלה סטטית
    watchDrag: slides.length > 1,
  });
  const [current, setCurrent] = useState(0);
  // סרטונים לא מתנגנים אוטומטית כשהמערכת מבקשת "פחות תנועה" — נבדק אחרי
  // ה-hydration כי window לא קיים בצד השרת
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const select = useCallback(() => {
    if (embla) setCurrent(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    select();
    embla.on("select", select);
    return () => {
      embla.off("select", select);
    };
  }, [embla, select]);

  // החלפה אוטומטית — מכובדת העדפת "פחות תנועה" של מערכת ההפעלה
  useEffect(() => {
    if (!embla || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => embla.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [embla, slides.length]);

  return (
    <section id="top" className="relative isolate">
      {/* שכבת התמונות המתחלפות — ממלאת את הסקשן, התוכן יושב מעליה */}
      <div ref={emblaRef} className="absolute inset-0 overflow-hidden">
        <div className="flex h-full">
          {slides.map((src, i) => (
            <div key={src} className="h-full min-w-0 shrink-0 grow-0 basis-full">
              {isVideoUrl(src) ? (
                // שקופית וידאו — מושתקת ובלולאה, כרקע חי מאחורי הטקסט
                <video
                  src={src}
                  muted
                  loop
                  playsInline
                  autoPlay={!reducedMotion}
                  preload={i === 0 ? "auto" : "metadata"}
                  aria-label={i === 0 ? t.hero.imageAlt : undefined}
                  className="size-full object-cover"
                />
              ) : (
                <img
                  src={src}
                  alt={i === 0 ? t.hero.imageAlt : ""}
                  width={1600}
                  height={1008}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="size-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* הצד הכהה של הגרדיאנט נשאר תמיד מאחורי הטקסט — לפי כיוון השפה */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[oklch(0.263_0.038_260/0.9)] via-[oklch(0.263_0.038_260/0.72)] to-[oklch(0.263_0.038_260/0.4)] rtl:bg-gradient-to-l" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
        {/* הלוגו כולל טקסט בנייבי כהה — על גבי התמונה הכהה הוא זקוק לרקע בהיר,
            כמו הטיפול בלוגו בפוטר. */}
        <img
          src={business.logoUrl || logo}
          alt={t.hero.logoAlt}
          width={160}
          height={175}
          className="h-24 w-auto rounded-2xl bg-white/95 object-contain p-3 shadow-soft md:h-32"
        />

        <h1 className="mt-6 max-w-2xl font-display text-3xl font-extrabold text-primary-foreground md:text-5xl">
          {texts.heroTitle}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">
          {texts.heroSubtitle}
        </p>
        <p className="mt-2 max-w-xl text-sm font-semibold text-primary-foreground/80">
          {business.subtitle}
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
              href={business.social?.whatsappGroup?.trim() || SITE_CONFIG.whatsappGroup.url1}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-[oklch(1_0_0/0.12)] px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur"
            >
              {t.hero.badgeGroup}
            </a>
          </li>
        </ul>

        {slides.length > 1 && (
          <div className="mt-8 flex gap-2" role="group" aria-label={t.hero.slidesAria}>
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={t.hero.slideAria(i + 1)}
                aria-current={i === current ? "true" : undefined}
                onClick={() => embla?.scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-sun" : "w-2 bg-primary-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
