import { DataSource } from "@/components/site/DataSource";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
  Sparkles,
  BellPlus,
  Images,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { neighborhoods, priceRanges, waProps, openWa, business } from "@/lib/site-data";
import {
  formatListingPrice,
  listingImage,
  listingImages,
  matchesFilters,
  type Listing,
  type ListingFilters,
} from "@/lib/listings";

import { aiSearchListings } from "@/lib/ai-search.functions";
import { isValidIsraeliPhone, phoneError } from "@/lib/leads";
import { Reveal } from "./Reveal";

const featureList = [
  { key: "has_mamad", label: "ממ״ד", Icon: ShieldCheck },
  { key: "has_elevator", label: "מעלית", Icon: MoveVertical },
  { key: "has_parking", label: "חניה", Icon: Car },
  { key: "has_balcony", label: "מרפסת", Icon: Trees },
] as const;

type Props = { listings: Listing[]; updatedAt: string | null };

export function PropertySection({ listings, updatedAt }: Props) {
  const [deal, setDeal] = useState("all");
  const [rooms, setRooms] = useState("all");
  const [range, setRange] = useState("all");
  const [area, setArea] = useState("all");
  const [selected, setSelected] = useState<Listing | null>(null);

  const [query, setQuery] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [ai, setAi] = useState<{ ids: string[]; explanation: string; filters: ListingFilters } | null>(null);

  const manual = useMemo(() => {
    const r = range === "all" ? null : priceRanges[Number(range)];
    const filters: ListingFilters = {
      deal_type: deal === "all" ? null : deal,
      neighborhoods: area === "all" ? [] : [area],
      min_price: r?.min ?? null,
      max_price: r?.max ?? null,
      min_rooms: rooms === "all" ? null : Number(rooms),
    };
    return listings.filter((l) => matchesFilters(l, filters));
  }, [listings, deal, rooms, range, area]);

  const filtered = useMemo(
    () => (ai ? manual.filter((l) => ai.ids.includes(l.id)) : manual),
    [manual, ai],
  );

  const runAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiErr(null);
    setAiBusy(true);
    try {
      const res = await aiSearchListings({ data: { query } });
      setAi({ ids: res.ids, explanation: res.explanation, filters: res.filters });
    } catch (err) {
      setAi(null);
      setAiErr(err instanceof Error ? err.message : "החיפוש נכשל");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section id="properties" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">נכסים בנתניה</p>
      <h2 className="mt-2 text-3xl md:text-4xl">נכסים למכירה ולהשכרה</h2>
      <DataSource source="db" updatedAt={updatedAt} className="mt-2" />

      {/* חיפוש חכם בטקסט חופשי */}
      <form onSubmit={runAiSearch} className="soft-card mt-6 p-4" noValidate>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-primary">
            <Sparkles className="size-4 text-sun" aria-hidden="true" />
            חיפוש חכם במילים שלכם
          </span>
          <input
            className="field"
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='למשל: 4 חדרים עם ממ״ד וחניה בעיר הימים עד 2.5 מיליון'
            aria-label="תיאור חופשי של הנכס שאתם מחפשים"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={aiBusy}
            className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-60"
          >
            {aiBusy ? "מחפש…" : "חיפוש חכם"}
          </button>
          {ai && (
            <button
              type="button"
              onClick={() => {
                setAi(null);
                setQuery("");
              }}
              className="rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary"
            >
              ניקוי החיפוש החכם
            </button>
          )}
        </div>
        {aiErr && (
          <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
            {aiErr}
          </p>
        )}
        {ai && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground" aria-live="polite">
            {ai.explanation || "סיננו את הנכסים לפי הבקשה שלכם."}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          החיפוש מסנן רק נכסים אמיתיים שקיימים במסד הנתונים של המשרד. אין המצאת נכסים.
        </p>
      </form>

      {/* סינון ידני */}
      <div className="soft-card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          נמצאו {filtered.length} נכסים
        </p>
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 rounded-xl border border-sun px-4 py-2 text-sm font-bold text-primary"
        >
          <BellPlus className="size-4 text-sun" aria-hidden="true" />
          סוכן אישי: התראות על נכסים חדשים
        </Link>
      </div>

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
            {...waProps("שלום, אני מחפש נכס בנתניה. הפרטים שלי: ")}
            className="mt-4 inline-block rounded-xl bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
          >
            נכס לפי דרישה בוואטסאפ
          </a>
        </div>
      )}

      <a
        href={business.yad2Url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-soft"
      >
        לכל הנכסים של הסוכנות ביד2
      </a>

      {selected && <PropertyModal property={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function PropertyCard({ property: p, onOpen }: { property: Listing; onOpen: () => void }) {
  const gallery = listingImages(p);
  const img = gallery[0] ?? null;

  return (
    <article className="soft-card flex h-full flex-col overflow-hidden">
      <div className="relative">
        {img ? (
          <img
            src={img}
            alt={`${p.title} ב${p.neighborhood ?? "נתניה"}`}
            width={800}
            height={533}
            loading="lazy"
            className="aspect-[3/2] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/2] w-full items-center justify-center bg-secondary text-sm text-muted-foreground">
            אין תמונה
          </div>
        )}
        {p.tag && (
          <span className="absolute top-3 right-3 rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground">
            {p.tag}
          </span>
        )}
        {gallery.length > 1 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary/85 px-2.5 py-1 text-xs font-bold text-primary-foreground">
            <Images className="size-3.5" aria-hidden="true" />
            {gallery.length} תמונות
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-xl font-extrabold text-primary">{formatListingPrice(p.price)}</p>
        <h3 className="mt-1 text-base">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-sun" aria-hidden="true" />
          {p.neighborhood ?? "אין מידע"}, {p.city}
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          <li className="flex items-center gap-1">
            <BedDouble className="size-4 text-sun" aria-hidden="true" />
            {p.rooms ?? "אין מידע"} חדרים
          </li>
          <li className="flex items-center gap-1">
            <Ruler className="size-4 text-sun" aria-hidden="true" />
            {p.size_sqm ?? "אין מידע"} מ״ר
          </li>
          <li className="flex items-center gap-1">
            <Building className="size-4 text-sun" aria-hidden="true" />
            קומה {p.floor ?? "אין מידע"}
          </li>
        </ul>

        <ul className="mt-3 flex flex-wrap gap-2">
          {featureList
            .filter(({ key }) => p[key])
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
            לפרטים
          </button>
          <a
            {...waProps(
              `שלום, הגעתי מהאתר של סאן סיטי נדל"ן.\nמעוניין בפרטים על הנכס:\n${p.title}\n${p.address ?? p.neighborhood ?? ""}\nמחיר: ${formatListingPrice(p.price)}`,
            )}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            לפרטים בוואטסאפ
          </a>
        </div>
      </div>
    </article>
  );
}

function PropertyModal({ property: p, onClose }: { property: Listing; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const img = listingImage(p);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("נא להזין שם");
    if (!isValidIsraeliPhone(form.phone)) return setErr(phoneError);
    setErr(null);
    openWa(
      `שלום ${business.name},\nאני מעוניין בנכס: ${p.title}\nאזור: ${p.neighborhood ?? "אין מידע"}\nמחיר: ${formatListingPrice(p.price)}\nשם: ${form.name}\nטלפון: ${form.phone}`,
    );
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
          {img && (
            <img
              src={img}
              alt={`${p.title} ב${p.neighborhood ?? "נתניה"}`}
              width={1200}
              height={800}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-xl object-cover"
            />
          )}

          <p className="mt-4 font-display text-2xl font-extrabold text-primary">
            {formatListingPrice(p.price)}
          </p>
          <p className="mt-2 leading-relaxed text-foreground">{p.description ?? "אין מידע"}</p>

          <table className="mt-4 w-full text-right text-sm">
            <caption className="sr-only">מפרט הנכס</caption>
            <tbody className="divide-y divide-border">
              {[
                ["סוג עסקה", p.deal_type],
                ["כתובת", p.address ?? "אין מידע"],
                ["חדרים", p.rooms == null ? "אין מידע" : String(p.rooms)],
                ["שטח", p.size_sqm == null ? "אין מידע" : `${p.size_sqm} מ״ר`],
                ["קומה", p.floor ?? "אין מידע"],
                ["ממ״ד", p.has_mamad ? "יש" : "אין"],
                ["מעלית", p.has_elevator ? "יש" : "אין"],
                ["חניה", p.has_parking ? "יש" : "אין"],
                ["מרפסת", p.has_balcony ? "יש" : "אין"],
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

          {p.neighborhood && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <iframe
                title={`מפת האזור: ${p.neighborhood}, ${p.city}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(`${p.neighborhood}, ${p.city}`)}&output=embed`}
                loading="lazy"
                className="h-56 w-full"
              />
            </div>
          )}

          <form onSubmit={submit} className="mt-5 rounded-xl bg-secondary p-4" noValidate>
            <p className="font-display text-lg font-bold text-primary">אני מעוניין בנכס</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">שם מלא</span>
                <input
                  className="field"
                  value={form.name}
                  maxLength={80}
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
                  maxLength={20}
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
