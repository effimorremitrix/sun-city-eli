import heroImg from "@/assets/hero-netanya.jpg";
import { stats } from "@/lib/site-data";

export function Hero() {
  return (
    <section id="top" className="relative isolate">
      <img
        src={heroImg}
        alt="מבט על מגדלי דירות וקו החוף של נתניה ביום שמשי"
        width={1600}
        height={1000}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[oklch(0.263_0.038_260/0.92)] via-[oklch(0.263_0.038_260/0.78)] to-[oklch(0.263_0.038_260/0.45)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
        <h1 className="max-w-2xl font-display text-3xl font-extrabold text-primary-foreground md:text-5xl">
          הדירה הבאה שלכם בנתניה מתחילה כאן
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">
          משרד תיווך מקומי שמכיר כל רחוב בעיר. ליווי אישי ממכירה ועד מסירת מפתח.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#sellers"
            className="rounded-xl bg-sun px-6 py-3 text-center text-base font-bold text-sun-foreground shadow-lift"
          >
            קבלו הערכת שווי חינם
          </a>
          <a
            href="#properties"
            className="rounded-xl border border-primary-foreground/50 px-6 py-3 text-center text-base font-bold text-primary-foreground"
          >
            לצפייה בנכסים
          </a>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-[oklch(1_0_0/0.1)] p-4 backdrop-blur">
              <dt className="order-2 text-sm text-primary-foreground/85">{s.label}</dt>
              <dd className="font-display text-3xl font-extrabold text-sun md:text-4xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
