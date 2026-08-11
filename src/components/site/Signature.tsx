import { Quote } from "lucide-react";
import signatureImg from "@/assets/cholent-signature.jpg";

export function Signature() {
  return (
    <section id="signature" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <img
          src={signatureImg}
          alt="מוזגים צ'ולנט חם לקערה"
          width={1200}
          height={1200}
          loading="lazy"
          className="aspect-square w-full rounded-3xl object-cover shadow-lift"
        />

        <div>
          <p className="text-sm font-bold tracking-wide text-gold">מנת הדגל</p>
          <h2 className="mt-2 text-3xl md:text-4xl">הצ'ולנט שלנו</h2>
          <p className="mt-4 text-lg leading-relaxed text-foreground/85">
            הצ'ולנט של אייזיק מתבשל לאט מליל חמישי, בסיר אחד, בלי קיצורי דרך. זו
            המנה שאנשים חוזרים אליה, ולא במקרה.
          </p>

          <figure className="linen-card mt-8 p-5">
            <Quote className="size-5 text-gold" />
            <blockquote className="mt-3 text-base font-medium">
              "צולנט טעים מאוד! אוירה נחמדה!"
            </blockquote>
            <figcaption className="mt-2 text-sm text-muted-foreground">
              בנימין ב.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
