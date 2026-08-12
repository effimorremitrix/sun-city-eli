import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock, MessageCircle, Sun, Facebook, Instagram } from "lucide-react";
import { business, mapsEmbedUrl, whatsappLink } from "@/lib/site-data";
import { isValidIsraeliPhone, phoneError } from "@/lib/leads";

export function ContactSection() {
  const [form, setForm] = useState({ name: "", phone: "", topic: "", message: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("נא להזין שם");
    if (!isValidIsraeliPhone(form.phone)) return setErr(phoneError);
    setErr(null);
    const msg = `שלום ${business.name},\nשם: ${form.name}\nטלפון: ${form.phone}\nנושא הפנייה: ${form.topic || "אחר"}\nהודעה: ${form.message || "-"}`;
    window.open(whatsappLink(msg), "_blank", "noopener,noreferrer");
  };

  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">צור קשר</p>
      <h2 className="mt-2 text-3xl md:text-4xl">מדברים איתנו</h2>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ul className="soft-card divide-y divide-border p-5">
            <li className="flex items-start gap-3 pb-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">כתובת</p>
                <p className="text-sm text-muted-foreground">{business.address}</p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={business.wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    ניווט בוויז
                  </a>
                  <a
                    href={business.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    ניווט בגוגל מפות
                  </a>
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3 py-4">
              <Phone className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">טלפון המשרד</p>
                <a href={`tel:${business.phoneTel}`} className="text-sm text-muted-foreground underline" dir="ltr">
                  {business.phone}
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3 py-4">
              <Mail className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">מייל</p>
                <a href={`mailto:${business.email}`} className="text-sm text-muted-foreground underline">
                  {business.email}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3 pt-4">
              <Clock className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
              <div>
                <p className="font-bold text-primary">שעות פעילות</p>
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
            href={whatsappLink(`שלום ${business.name}, אשמח לקבל פרטים`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-3 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            שליחת הודעה בוואטסאפ
          </a>

          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title="מפת Google — שמואל הנציב 20, נתניה"
              src={mapsEmbedUrl}
              loading="lazy"
              className="h-64 w-full"
            />
          </div>
        </div>

        <form onSubmit={submit} noValidate className="soft-card h-fit p-5" aria-label="טופס יצירת קשר">
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">שם מלא</span>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">טלפון</span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                placeholder="050-1234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">נושא הפנייה</span>
              <select className="field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                <option value="">בחירה</option>
                <option>מוכר</option>
                <option>קונה</option>
                <option>משקיע</option>
                <option>אחר</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">הודעה</span>
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
          <button type="submit" className="mt-4 w-full rounded-xl bg-sun py-3.5 text-base font-bold text-sun-foreground">
            שליחה
          </button>
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy px-4 py-10 pb-28 text-navy-foreground lg:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-extrabold text-navy-foreground">
            <Sun className="size-5 text-sun" aria-hidden="true" />
            {business.nameEn} נדל"ן
          </p>
          <p className="mt-1 text-sm text-navy-foreground/75">{business.tagline}</p>
          <div className="mt-4 flex gap-2">
            <a
              href={business.social.facebook.startsWith("http") ? business.social.facebook : "#contact"}
              aria-label="עמוד הפייסבוק שלנו"
              className="inline-flex size-9 items-center justify-center rounded-lg bg-[oklch(1_0_0/0.1)]"
            >
              <Facebook className="size-4" aria-hidden="true" />
            </a>
            <a
              href={business.social.instagram.startsWith("http") ? business.social.instagram : "#contact"}
              aria-label="עמוד האינסטגרם שלנו"
              className="inline-flex size-9 items-center justify-center rounded-lg bg-[oklch(1_0_0/0.1)]"
            >
              <Instagram className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="text-sm text-navy-foreground/85">
          <p className="font-bold text-navy-foreground">פרטי קשר</p>
          <p className="mt-2">{business.address}</p>
          <p className="mt-1">
            <a href={`tel:${business.phone}`} className="underline">
              {business.phone}
            </a>
          </p>
          <p className="mt-1">
            <a href={`mailto:${business.email}`} className="underline">
              {business.email}
            </a>
          </p>
        </div>

        <nav aria-label="קישורים בתחתית העמוד" className="text-sm text-navy-foreground/85">
          <p className="font-bold text-navy-foreground">קישורים</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <a href="#properties" className="underline">נכסים</a>
            </li>
            <li>
              <a href="#sellers" className="underline">הערכת שווי חינם</a>
            </li>
            <li>
              <a
                href={business.madlanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                דף הסוכנות במדל"ן
              </a>
            </li>
            <li>
              <a href="#team" className="underline">הצוות</a>
            </li>

            <li>
              <Link to="/accessibility" className="underline">הצהרת נגישות</Link>
            </li>
            <li>
              <Link to="/privacy" className="underline">מדיניות פרטיות</Link>
            </li>
          </ul>
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-xs text-navy-foreground/60">
        © {new Date().getFullYear()} {business.name}. כל הזכויות שמורות.
      </p>
    </footer>
  );
}
