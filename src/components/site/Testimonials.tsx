import { DataSource } from "@/components/site/DataSource";
import { useState } from "react";
import { ChevronRight, ChevronLeft, Quote, Plus, Minus } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Testimonials() {
  const { dir, t } = useLang();
  const [i, setI] = useState(0);
  const items = t.testimonials.items;
  const item = items[i]!;

  const prev = () => setI((v) => (v - 1 + items.length) % items.length);
  const next = () => setI((v) => (v + 1) % items.length);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.testimonials.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.testimonials.title}</h2>
      <DataSource source="office" updatedAt={null} className="mt-2" />

      <div className="soft-card mt-6 p-6">
        <Quote className="size-7 text-sun" aria-hidden="true" />
        <blockquote className="mt-3 text-lg leading-relaxed text-foreground">
          "{item.quote}"
        </blockquote>
        <p className="mt-4 font-bold text-primary">
          {item.name} <span className="font-normal text-muted-foreground">· {item.type}</span>
        </p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-2">
            {/* החיצים פיזיים — כיוון הדפדוף מתהפך לפי כיוון השפה */}
            <button
              type="button"
              aria-label={dir === "rtl" ? t.testimonials.prevAria : t.testimonials.nextAria}
              onClick={dir === "rtl" ? prev : next}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={dir === "rtl" ? t.testimonials.nextAria : t.testimonials.prevAria}
              onClick={dir === "rtl" ? next : prev}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.testimonials.counter(i + 1, items.length)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 pb-14 md:pb-20">
      <p className="text-sm font-bold text-sun">{t.faq.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.faq.title}</h2>

      <ul className="mt-6 space-y-3">
        {t.faq.items.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q} className="soft-card overflow-hidden">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-start text-base font-bold text-primary"
                >
                  {f.q}
                  {isOpen ? (
                    <Minus className="size-5 shrink-0 text-sun" aria-hidden="true" />
                  ) : (
                    <Plus className="size-5 shrink-0 text-sun" aria-hidden="true" />
                  )}
                </button>
              </h3>
              {isOpen && (
                <p className="border-t border-border p-4 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
