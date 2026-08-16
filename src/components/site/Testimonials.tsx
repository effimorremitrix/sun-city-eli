import { DataSource } from "@/components/site/DataSource";
import { useState } from "react";
import { ChevronRight, ChevronLeft, Quote, Plus, Minus } from "lucide-react";
import { useT } from "@/lib/i18n";

export function Testimonials() {
  const [i, setI] = useState(0);
  const dict = useT();
  const testimonials = dict.content.testimonials;
  const t = testimonials[i]!;

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{dict.sections.testimonialsLabel}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{dict.sections.testimonialsTitle}</h2>
      <DataSource source="office" updatedAt={null} className="mt-2" />

      <div className="soft-card mt-6 p-6">
        <Quote className="size-7 text-sun" aria-hidden="true" />
        <blockquote className="mt-3 text-lg leading-relaxed text-foreground">"{t.quote}"</blockquote>
        <p className="mt-4 font-bold text-primary">
          {t.name} <span className="font-normal text-muted-foreground">· {t.type}</span>
        </p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              aria-label={dict.sections.testimonialPrev}
              onClick={() => setI((v) => (v - 1 + testimonials.length) % testimonials.length)}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={dict.sections.testimonialNext}
              onClick={() => setI((v) => (v + 1) % testimonials.length)}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {dict.sections.testimonialOf(i + 1, testimonials.length)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const dict = useT();
  const faq = dict.content.faq;

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 pb-14 md:pb-20">
      <p className="text-sm font-bold text-sun">{dict.sections.faqLabel}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{dict.sections.faqTitle}</h2>

      <ul className="mt-6 space-y-3">
        {faq.map((f, i) => {
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
