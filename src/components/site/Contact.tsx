import { MapPin, Phone, Clock, BadgeCheck, Navigation } from "lucide-react";
import { business } from "@/lib/business";

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold tracking-wide text-gold">צור קשר</p>
      <h2 className="mt-2 text-3xl md:text-4xl">באים אלינו</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ul className="linen-card divide-y divide-border p-5">
          <li className="flex items-start gap-3 pb-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-gold" />
            <div>
              <p className="font-bold">כתובת</p>
              <p className="text-sm text-muted-foreground">{business.address}</p>
            </div>
          </li>
          <li className="flex items-start gap-3 py-4">
            <Phone className="mt-0.5 size-5 shrink-0 text-gold" />
            <div>
              <p className="font-bold">טלפון</p>
              <p className="text-sm text-muted-foreground">{business.phone}</p>
            </div>
          </li>
          <li className="flex items-start gap-3 py-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-gold" />
            <div>
              <p className="font-bold">שעות פתיחה</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {business.hours.map((h) => (
                  <li key={h.day}>
                    {h.day}: {h.value}
                  </li>
                ))}
              </ul>
            </div>
          </li>
          <li className="flex items-start gap-3 pt-4">
            <BadgeCheck className="mt-0.5 size-5 shrink-0 text-gold" />
            <div>
              <p className="font-bold">כשרות</p>
              <p className="text-sm text-muted-foreground">{business.kosher}</p>
            </div>
          </li>
        </ul>

        <div className="linen-card flex flex-col justify-between gap-4 p-5">
          <p className="text-base leading-relaxed text-foreground/85">
            יש אכילה במקום ואיסוף עצמי. מגיעים עם המשפחה, עם החברים מהעבודה, או
            סתם בשביל קערה חמה באמצע היום.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={business.wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              <Navigation className="size-4" />
              ניווט בוויז
            </a>
            <a
              href={business.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 py-3 text-sm font-bold text-primary"
            >
              <MapPin className="size-4" />
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50 px-4 py-8 pb-28 text-center md:pb-8">
      <p className="font-display text-lg font-bold text-primary">{business.name}</p>
      <p className="mt-1 text-sm text-muted-foreground">{business.tagline}</p>
      <p className="mt-4 text-xs text-muted-foreground">{business.address}</p>
    </footer>
  );
}
