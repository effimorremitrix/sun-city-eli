import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { SITE_CONFIG, mapsEmbedUrl, mapsUrl, wazeUrl, waProps, openWa } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import logoIcon from "@/assets/sun-city-logo-icon.svg";
import { isValidIsraeliPhone } from "@/lib/leads";
import { useLang } from "@/lib/i18n";

export function ContactSection() {
  const { business } = useLive();
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", topic: "", message: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.contact.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(t.misc.phoneError);
    setErr(null);
    openWa(
      t.contact.waMsg(business.name, {
        name: form.name,
        phone: form.phone,
        topic: form.topic || t.contact.topicOther,
        message: form.message || "-",
      }),
    );
  };

  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.contact.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.contact.title}</h2>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ul className="soft-card divide-y divide-border p-5">
            <li className="flex items-start gap-3 pb-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">{t.contact.addressLabel}</p>
                <p className="text-sm text-muted-foreground">{business.address}</p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    {t.contact.waze}
                  </a>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    {t.contact.gmaps}
                  </a>
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3 py-4">
              <Phone className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">{t.contact.phoneLabel}</p>
                <a
                  href={`tel:${business.phoneTel}`}
                  className="text-sm text-muted-foreground underline"
                  dir="ltr"
                >
                  {business.phone}
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3 py-4">
              <Mail className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">{t.contact.emailLabel}</p>
                <a
                  href={`mailto:${business.email}`}
                  className="text-sm text-muted-foreground underline"
                >
                  {business.email}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3 pt-4">
              <Clock className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">{t.contact.hoursLabel}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {business.hours.map((h) => (
                    <li key={h.day}>
                      {h.day}: {h.value}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>

          <a
            {...waProps(t.contact.waHello(business.name))}
            className="flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-3 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            {t.contact.waSend}
          </a>

          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title={t.contact.mapTitle}
              src={mapsEmbedUrl}
              loading="lazy"
              className="h-64 w-full"
            />
          </div>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className="soft-card h-fit p-5"
          aria-label={t.contact.formAria}
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.contact.fullName}
              </span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.contact.phone}
              </span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                placeholder={t.contact.phonePlaceholder}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.contact.topicLabel}
              </span>
              <select
                className="field"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                <option value="">{t.contact.choose}</option>
                {t.contact.topics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.contact.message}
              </span>
              <textarea
                className="field min-h-28"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </label>
          </div>
          {err && (
            <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
              {err}
            </p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-sun py-3.5 text-base font-bold text-sun-foreground"
          >
            {t.contact.submit}
          </button>
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  const { business } = useLive();
  const { t } = useLang();

  return (
    <footer className="border-t border-border bg-navy px-4 py-10 pb-28 text-navy-foreground lg:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-extrabold text-navy-foreground">
            <img
              src={logoIcon}
              alt={t.footer.logoAlt}
              width={48}
              height={48}
              className="size-12 rounded-lg bg-white object-contain p-1"
            />
            {business.name}
          </p>
          <p className="mt-1 text-sm text-navy-foreground/75">{business.tagline}</p>
          {/* קישורי הרשתות החברתיות עברו לראש העמוד (Header) — אייקונים צבעוניים */}
        </div>

        <div className="text-sm text-navy-foreground/85">
          <p className="font-bold text-navy-foreground">{t.footer.contactTitle}</p>
          <p className="mt-2">{business.address}</p>
          <p className="mt-1">
            <a href={`tel:${business.phoneTel}`} className="underline">
              {business.phone}
            </a>
          </p>
          <p className="mt-1">
            <a href={`mailto:${business.email}`} className="underline">
              {business.email}
            </a>
          </p>
        </div>

        <nav aria-label={t.footer.linksAria} className="text-sm text-navy-foreground/85">
          <p className="font-bold text-navy-foreground">{t.footer.linksTitle}</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <a href="#properties" className="underline">
                {t.footer.properties}
              </a>
            </li>
            <li>
              <a href="#sellers" className="underline">
                {t.footer.freeValuation}
              </a>
            </li>
            <li>
              <a
                href={SITE_CONFIG.madlanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t.footer.madlan}
              </a>
            </li>
            <li>
              <a href="#team" className="underline">
                {t.footer.team}
              </a>
            </li>

            <li>
              <Link to="/accessibility" className="underline">
                {t.footer.accessibility}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="underline">
                {t.footer.privacy}
              </Link>
            </li>
            <li className="mt-3 border-t border-navy-foreground/15 pt-3 text-xs text-navy-foreground/55">
              <Link to="/account" className="underline">
                {t.footer.myAccount}
              </Link>
              <span aria-hidden="true" className="px-1.5">
                ·
              </span>
              <Link to="/account" search={{ tab: "listings" }} className="underline">
                {t.footer.adminSite}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-xs text-navy-foreground/60">
        {t.footer.license(business.license)}
      </p>
      <p className="mx-auto mt-2 max-w-6xl text-xs text-navy-foreground/60">
        {t.footer.rights(new Date().getFullYear(), business.name)}
      </p>
    </footer>
  );
}
