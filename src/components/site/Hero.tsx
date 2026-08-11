import heroImg from "@/assets/hero-cholent.jpg";
import { business } from "@/lib/business";

export function Hero() {
  return (
    <section id="top" className="relative isolate">
      <img
        src={heroImg}
        alt="סיר צ'ולנט ביתי מהביל על שולחן עץ"
        width={1600}
        height={1104}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.2_0.03_50/0.88)] via-[oklch(0.2_0.03_50/0.6)] to-[oklch(0.2_0.03_50/0.45)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-start px-4 py-24 md:py-36">
        <h1 className="font-display text-4xl font-extrabold text-primary-foreground md:text-6xl">
          {business.name}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-primary-foreground/90 md:text-lg">
          אוכל יהודי ביתי בנתניה. צ'ולנט, קוגל וחמין כמו בבית סבתא.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a
            href="#shabbat"
            className="rounded-xl bg-gold px-6 py-3 text-center text-base font-bold text-gold-foreground shadow-lift"
          >
            להזמנת שבת
          </a>
          <a
            href="#menu"
            className="rounded-xl border border-primary-foreground/50 px-6 py-3 text-center text-base font-bold text-primary-foreground"
          >
            לתפריט המלא
          </a>
        </div>

        <p className="mt-8 text-sm text-primary-foreground/80">
          כשר <span className="mx-2 text-gold">|</span> איסוף עצמי
          <span className="mx-2 text-gold">|</span> מקום לשבת
        </p>
      </div>
    </section>
  );
}
