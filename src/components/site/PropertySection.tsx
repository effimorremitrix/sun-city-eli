import { useMemo, useState } from "react";
import {
  ShieldCheck,
  MoveVertical,
  Car,
  Trees,
  X,
  MessageCircle,
  Ruler,
  BedDouble,
  Building,
  MapPin,
} from "lucide-react";
import {
  properties,
  neighborhoods,
  priceRanges,
  formatPrice,
  whatsappLink,
  business,
  type Property,
} from "@/lib/site-data";
import { isValidIsraeliPhone, phoneError } from "@/lib/leads";
import { Reveal } from "./Reveal";

const featureList = [
  { key: "mamad", label: "ממ״ד", Icon: ShieldCheck },
  { key: "elevator", label: "מעלית", Icon: MoveVertical },
  { key: "parking", label: "חניה", Icon: Car },
  { key: "balcony", label: "מרפסת", Icon: Trees },
] as const;

export function PropertySection() {
  const [deal, setDeal] = useState("all");
  const [rooms, setRooms] = useState("all");
  const [range, setRange] = useState("all");
  const [area, setArea] = useState("all");
  const [selected, setSelected] = useState<Property | null>(null);

  const filtered = useMemo(
    () =>
      properties.filter((p) => {
        if (deal !== "all" && p.deal !== deal) return false;
        if (rooms !== "all" && p.rooms < Number(rooms)) return false;
        if (area !== "all" && p.neighborhood !== area) return false;
        if (range !== "all") {
          const r = priceRanges[Number(range)];
          if (r && (p.price < r.min || p.price > r.max)) return false;
        }
        return true;
      }),
    [deal, rooms, range, area],
  );

  return (
    <section id="properties" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">נכסים בנתניה</p>
      <h2 className="mt-2 text-3xl md:text-4xl">נכסים למכירה ולהשכרה</h2>

      {/* חיפוש מהיר */}
      <div className="soft-card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">עסקה</span>
          <select className="field" value={deal} onChange={(e) => setDeal(e.target.value)} aria-label="סוג עסקה">
            <option value="all">הכל</option>
            <option value="מכירה">מכירה</option>
            <option value="השכרה">השכרה</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">חדרים (מינימום)</span>
          <select className="field" value={rooms} onChange={(e) => setRooms(e.target.value)} aria-label="מספר חדרים">
            <option value="all">הכל</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">טווח מחיר</span>
          <select className="field" value={range} onChange={(e) => setRange(e.target.value)} aria-label="טווח מחיר">
            <option value="all">הכל</option>
            {priceRanges.map((r, i) => (
              <option key={r.label} value={String(i)}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">אזור בנתניה</span>
          <select className="field" value={area} onChange={(e) => setArea(e.target.value)} aria-label="אזור בנתניה">
            <option value="all">כל האזורים</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        נמצאו {filtered.length} נכסים
      </p>

      <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, i) => (
          <li key={p.id}>
            <Reveal delay={i * 60}>
              <PropertyCard property={p} onOpen={() => setSelected(p)} />
            </Reveal>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <div className="soft-card mt-4 p-6 text-center">
          <p className="font-bold text-primary">לא נמצאו נכסים בסינון הזה</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ספרו לנו מה אתם מחפשים ונאתר עבורכם נכס מתאים.
          </p>
          <a
            href={whatsappLink("שלום, אני מחפש נכס בנתניה. הפרטים שלי: ")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
          >
            נכס לפי דרישה בוואטסאפ
          </a>
        </div>
      )}

      {selected && <PropertyModal property={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function PropertyCard({ property: p, onOpen }: { property: Property; onOpen: () => void }) {
  return (
    <article className="soft-card group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-1">
      <div className="relative">
        <img
          src={p.images[0]}
          alt={`${p.title} ב${p.neighborhood}, נתניה`}
          width={1200}
          height={800}
          loading="lazy"
          className="aspect-[3/2] w-full object-cover"
        />
        {p.tag && (
          <span className="absolute top-3 right-3 rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground">
            {p.tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-xl font-extrabold text-primary">{formatPrice(p.price)}</p>
        <h3 className="mt-1 text-base">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-sun" aria-hidden="true" />
          {p.neighborhood}, נתניה
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          <li className="flex items-center gap-1">
            <BedDouble className="size-4 text-sun" aria-hidden="true" />
            {p.rooms} חדרים
          </li>
          <li className="flex items-center gap-1">
            <Ruler className="size-4 text-sun" aria-hidden="true" />
            {p.size} מ״ר
          </li>
          <li className="flex items-center gap-1">
            <Building className="size-4 text-sun" aria-hidden="true" />
            קומה {p.floor}
          </li>
        </ul>

        <ul className="mt-3 flex flex-wrap gap-2">
          {featureList
            .filter(({ key }) => p.features[key])
            .map(({ key, label, Icon }) => (
              <li
                key={key}
                className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </li>
            ))}
        </ul>

        <div className="mt-4 flex gap-2 pt-1">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
          >
            כל הפרטים
          </button>
          <a
            href={whatsappLink(
              `שלום, מעניין אותי הנכס: ${p.title} (${p.neighborhood}), ${formatPrice(p.price)}. אפשר פרטים?`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            לפרטים בוואטסאפ
          </a>
        </div>
      </div>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Residence",
            name: p.title,
            description: p.description,
            numberOfRooms: p.rooms,
            floorSize: { "@type": "QuantitativeValue", value: p.size, unitCode: "MTK" },
            address: {
              "@type": "PostalAddress",
              streetAddress: p.address,
              addressLocality: "נתניה",
              addressCountry: "IL",
            },
          }),
        }}
      />
    </article>
  );
}

function PropertyModal({ property: p, onClose }: { property: Property; onClose: () => void }) {
  const [img, setImg] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("נא להזין שם");
    if (!isValidIsraeliPhone(form.phone)) return setErr(phoneError);
    setErr(null);
    const msg = `שלום ${business.name},\nאני מעוניין בנכס: ${p.title}\nאזור: ${p.neighborhood}\nמחיר: ${formatPrice(p.price)}\nשם: ${form.name}\nטלפון: ${form.phone}`;
    window.open(whatsappLink(msg), "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`פרטי נכס: ${p.title}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[oklch(0.263_0.038_260/0.6)] p-0 sm:items-center sm:p-4"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <h3 className="text-lg">{p.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת חלון פרטי הנכס"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          <img
            src={p.images[img]}
            alt={`תמונה ${img + 1} של ${p.title} ב${p.neighborhood}`}
            width={1200}
            height={800}
            loading="lazy"
            className="aspect-[3/2] w-full rounded-xl object-cover"
          />
          <div className="mt-2 flex gap-2">
            {p.images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setImg(i)}
                aria-label={`הצגת תמונה ${i + 1}`}
                className={`overflow-hidden rounded-lg border-2 ${i === img ? "border-sun" : "border-transparent"}`}
              >
                <img src={src} alt="" width={120} height={80} loading="lazy" className="h-16 w-24 object-cover" />
              </button>
            ))}
          </div>

          <p className="mt-4 font-display text-2xl font-extrabold text-primary">{formatPrice(p.price)}</p>
          <p className="mt-2 leading-relaxed text-foreground">{p.description}</p>

          <table className="mt-4 w-full text-right text-sm">
            <caption className="sr-only">מפרט הנכס</caption>
            <tbody className="divide-y divide-border">
              {[
                ["סוג עסקה", p.deal],
                ["כתובת", p.address],
                ["חדרים", `${p.rooms}`],
                ["שטח", `${p.size} מ״ר`],
                ["קומה", p.floor],
                ["ממ״ד", p.features.mamad ? "יש" : "אין"],
                ["מעלית", p.features.elevator ? "יש" : "אין"],
                ["חניה", p.features.parking ? "יש" : "אין"],
                ["מרפסת", p.features.balcony ? "יש" : "אין"],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" className="py-2 font-semibold text-muted-foreground">
                    {k}
                  </th>
                  <td className="py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <iframe
              title={`מפת האזור: ${p.neighborhood}, נתניה`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(p.neighborhood + ", נתניה")}&output=embed`}
              loading="lazy"
              className="h-56 w-full"
            />
          </div>

          <form onSubmit={submit} className="mt-5 rounded-xl bg-secondary p-4" noValidate>
            <p className="font-display text-lg font-bold text-primary">אני מעוניין בנכס</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">שם מלא</span>
                <input
                  className="field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">טלפון</span>
                <input
                  className="field"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </label>
            </div>
            {err && (
              <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
                {err}
              </p>
            )}
            <button
              type="submit"
              className="mt-3 w-full rounded-xl bg-whatsapp py-3 text-base font-bold text-whatsapp-foreground"
            >
              שליחה בוואטסאפ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
