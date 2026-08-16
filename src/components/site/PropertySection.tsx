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
  UserRound,
  Globe,
} from "lucide-react";
import { neighborhoods, priceRanges, waProps, openWa, business } from "@/lib/site-data";
import {
  formatListingPrice,
  listingImages,
  matchesFilters,
  type Listing,
  type ListingFilters,
} from "@/lib/listings";

import { aiSearchListings, type AiSearchResult } from "@/lib/ai-search.functions";
import { useLive } from "@/lib/site-live";
import { useT } from "@/lib/i18n";
import { isValidIsraeliPhone, phoneError } from "@/lib/leads";
import { Reveal } from "./Reveal";

const featureList = [
  { key: "has_mamad", fk: "mamad", Icon: ShieldCheck },
  { key: "has_elevator", fk: "elevator", Icon: MoveVertical },
  { key: "has_parking", fk: "parking", Icon: Car },
  { key: "has_balcony", fk: "balcony", Icon: Trees },
] as const;

type Props = { listings: Listing[]; updatedAt: string | null };

export function PropertySection({ listings, updatedAt }: Props) {
  const { business: live } = useLive();
  const t = useT();
  const [deal, setDeal] = useState("all");
  const [rooms, setRooms] = useState("all");
  const [range, setRange] = useState("all");
  const [area, setArea] = useState("all");
  const [selected, setSelected] = useState<Listing | null>(null);

  const [query, setQuery] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [ai, setAi] = useState<{
    ids: string[];
    explanation: string;
    filters: ListingFilters;
    web: AiSearchResult["web"];
  } | null>(null);

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
      setAi({ ids: res.ids, explanation: res.explanation, filters: res.filters, web: res.web });
    } catch (err) {
      setAi(null);
      setAiErr(err instanceof Error ? err.message : "החיפוש נכשל");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section id="properties" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.properties.label}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.properties.title}</h2>
      <DataSource source="db" updatedAt={updatedAt} className="mt-2" />

      {/* חיפוש חכם בטקסט חופשי */}
      <form onSubmit={runAiSearch} className="soft-card mt-6 p-4" noValidate>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-primary">
            <Sparkles className="size-4 text-sun" aria-hidden="true" />
            {t.properties.aiLabel}
          </span>
          <input
            className="field"
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.properties.aiPlaceholder}
            aria-label={t.properties.aiLabel}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={aiBusy}
            className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-60"
          >
            {aiBusy ? t.properties.aiBusy : t.properties.aiButton}
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
              {t.properties.aiClear}
            </button>
          )}
        </div>
        {aiErr && (
          <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
            {aiErr}
          </p>
        )}
        {ai && (
          <p
            className="mt-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground"
            aria-live="polite"
          >
            {ai.explanation || t.properties.aiDefaultExplanation}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t.properties.aiNote}</p>
      </form>

      {/* סינון ידני */}
      <div className="soft-card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            {t.properties.filterDeal}
          </span>
          <select
            className="field"
            value={deal}
            onChange={(e) => setDeal(e.target.value)}
            aria-label={t.properties.filterDeal}
          >
            <option value="all">{t.properties.all}</option>
            <option value="מכירה">{t.properties.dealSale}</option>
            <option value="השכרה">{t.properties.dealRent}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            {t.properties.filterRooms}
          </span>
          <select
            className="field"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            aria-label={t.properties.filterRooms}
          >
            <option value="all">{t.properties.all}</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            {t.properties.filterPrice}
          </span>
          <select
            className="field"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label={t.properties.filterPrice}
          >
            <option value="all">{t.properties.all}</option>
            {priceRanges.map((r, i) => (
              <option key={r.label} value={String(i)}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            {t.properties.filterArea}
          </span>
          <select
            className="field"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label={t.properties.filterArea}
          >
            <option value="all">{t.properties.allAreas}</option>
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
          {t.properties.found(filtered.length)}
        </p>
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 rounded-xl border border-sun px-4 py-2 text-sm font-bold text-primary"
        >
          <BellPlus className="size-4 text-sun" aria-hidden="true" />
          {t.properties.alertsCta}
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
          <p className="font-bold text-primary">{t.properties.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.properties.emptyText}</p>
          <a
            {...waProps("שלום, אני מחפש נכס בנתניה. הפרטים שלי: ", live.phoneTel)}
            className="mt-4 inline-block rounded-xl bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
          >
            {t.properties.emptyWa}
          </a>
        </div>
      )}

      {ai && <WebCandidates web={ai.web} agentPhone={live.phoneTel} agentName={live.agentName} />}

      <a
        href={business.yad2Url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-soft"
      >
        {t.properties.yad2}
      </a>

      {selected && <PropertyModal property={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function PropertyCard({ property: p, onOpen }: { property: Listing; onOpen: () => void }) {
  const t = useT();
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
            {t.properties.noImage}
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
            {t.properties.photosCount(gallery.length)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-xl font-extrabold text-primary">
          {formatListingPrice(p.price)}
        </p>
        <h3 className="mt-1 text-base">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-sun" aria-hidden="true" />
          {p.neighborhood ?? t.properties.noInfo}, {p.city}
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          <li className="flex items-center gap-1">
            <BedDouble className="size-4 text-sun" aria-hidden="true" />
            {p.rooms ?? t.properties.noInfo} {t.properties.rooms}
          </li>
          <li className="flex items-center gap-1">
            <Ruler className="size-4 text-sun" aria-hidden="true" />
            {p.size_sqm ?? t.properties.noInfo} {t.properties.sqm}
          </li>
          <li className="flex items-center gap-1">
            <Building className="size-4 text-sun" aria-hidden="true" />
            {t.properties.floor} {p.floor ?? t.properties.noInfo}
          </li>
        </ul>

        <ul className="mt-3 flex flex-wrap gap-2">
          {featureList
            .filter(({ key }) => p[key])
            .map(({ key, fk, Icon }) => (
              <li
                key={key}
                className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {t.properties.features[fk]}
              </li>
            ))}
        </ul>

        {p.agent && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <UserRound className="size-3.5 text-sun" aria-hidden="true" />
            {t.properties.agentOfListing} {p.agent.name}
          </p>
        )}

        <div className="mt-4 flex gap-2 pt-1">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
          >
            {t.properties.details}
          </button>
          <a
            {...waProps(
              `שלום${p.agent ? ` ${p.agent.name}` : ""}, הגעתי מהאתר של סאן סיטי נדל"ן.\nמעוניין בפרטים על הנכס:\n${p.title}\n${p.address ?? p.neighborhood ?? ""}\nמחיר: ${formatListingPrice(p.price)}`,
              p.agent?.phoneTel ?? undefined,
            )}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t.properties.waDetails}
          </a>
        </div>
      </div>
    </article>
  );
}

function PropertyModal({ property: p, onClose }: { property: Listing; onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const gallery = listingImages(p);
  const [index, setIndex] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.seller.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(phoneError);
    setErr(null);
    openWa(
      `שלום ${p.agent?.name ?? business.name},\nאני מעוניין בנכס: ${p.title}\nאזור: ${p.neighborhood ?? "אין מידע"}\nמחיר: ${formatListingPrice(p.price)}\nשם: ${form.name}\nטלפון: ${form.phone}`,
      p.agent?.phoneTel ?? undefined,
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
          {gallery.length > 0 && (
            <div>
              <div className="relative">
                <img
                  src={gallery[index]!}
                  alt={`${p.title} ב${p.neighborhood ?? "נתניה"} — תמונה ${index + 1} מתוך ${gallery.length}`}
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-xl object-cover"
                />
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i + 1) % gallery.length)}
                      aria-label="התמונה הבאה"
                      className="absolute top-1/2 left-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-primary shadow"
                    >
                      <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                      aria-label="התמונה הקודמת"
                      className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-primary shadow"
                    >
                      <ChevronRight className="size-5" aria-hidden="true" />
                    </button>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/85 px-2.5 py-1 text-xs font-bold text-primary-foreground">
                      {index + 1} / {gallery.length}
                    </span>
                  </>
                )}
              </div>

              {gallery.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`הצגת תמונה ${i + 1}`}
                      aria-current={i === index}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-sun" : "border-transparent"}`}
                    >
                      <img src={src} alt="" className="h-16 w-24 object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-4 font-display text-2xl font-extrabold text-primary">
            {formatListingPrice(p.price)}
          </p>
          <p className="mt-2 leading-relaxed text-foreground">
            {p.description ?? t.properties.noInfo}
          </p>

          <table className="mt-4 w-full text-right text-sm">
            <caption className="sr-only">מפרט הנכס</caption>
            <tbody className="divide-y divide-border">
              {[
                [t.properties.modal.agent, p.agent?.name ?? t.properties.noInfo],
                [t.properties.modal.deal, p.deal_type],
                [t.properties.modal.address, p.address ?? t.properties.noInfo],
                [t.properties.modal.rooms, p.rooms == null ? t.properties.noInfo : String(p.rooms)],
                [
                  t.properties.modal.size,
                  p.size_sqm == null ? t.properties.noInfo : `${p.size_sqm} ${t.properties.sqm}`,
                ],
                [t.properties.modal.floor, p.floor ?? t.properties.noInfo],
                [
                  t.properties.modal.mamad,
                  p.has_mamad ? t.properties.modal.yes : t.properties.modal.no,
                ],
                [
                  t.properties.modal.elevator,
                  p.has_elevator ? t.properties.modal.yes : t.properties.modal.no,
                ],
                [
                  t.properties.modal.parking,
                  p.has_parking ? t.properties.modal.yes : t.properties.modal.no,
                ],
                [
                  t.properties.modal.balcony,
                  p.has_balcony ? t.properties.modal.yes : t.properties.modal.no,
                ],
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
            <p className="font-display text-lg font-bold text-primary">
              {t.properties.modal.interested}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.properties.modal.fullName}
                </span>
                <input
                  className="field"
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.properties.modal.phone}
                </span>
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
              {t.properties.modal.sendWa}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** מודעות אמיתיות מהאינטרנט שנמצאו בסריקה — עם קישור למקור וניתוב לסוכן של הדף */
function WebCandidates({
  web,
  agentPhone,
  agentName,
}: {
  web: AiSearchResult["web"];
  agentPhone: string;
  agentName: string;
}) {
  const t = useT();
  if (web.status === "login_required") {
    return (
      <div className="soft-card mt-6 p-5">
        <p className="flex items-center gap-1.5 font-bold text-primary">
          <Globe className="size-4 text-sun" aria-hidden="true" />
          {t.properties.web.loginTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t.properties.web.loginText}</p>
        <Link
          to="/auth"
          className="mt-3 inline-block rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground"
        >
          {t.properties.web.loginCta}
        </Link>
      </div>
    );
  }

  if (web.status === "quota_exceeded") {
    return (
      <p className="soft-card mt-6 p-5 text-sm text-muted-foreground">{t.properties.web.quota}</p>
    );
  }

  if (web.status === "unavailable") {
    return (
      <p className="soft-card mt-6 p-5 text-sm text-muted-foreground">
        {t.properties.web.unavailable}
      </p>
    );
  }

  if (web.candidates.length === 0) {
    return (
      <p className="soft-card mt-6 p-5 text-sm text-muted-foreground">{t.properties.web.empty}</p>
    );
  }

  return (
    <section className="mt-8" aria-label={t.properties.web.title}>
      <h3 className="flex items-center gap-1.5 text-xl font-extrabold text-primary">
        <Globe className="size-5 text-sun" aria-hidden="true" />
        {t.properties.web.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.properties.web.subtitle}
        {web.remaining != null && t.properties.web.remaining(web.remaining)}
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {web.candidates.map((c) => (
          <li key={c.source_url} className="soft-card flex h-full flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                {c.source_site}
              </span>
              <span className="text-xs font-bold text-sun">
                {t.properties.web.match} {c.match_score}%
              </span>
            </div>
            <h4 className="mt-2 text-base font-bold text-primary">{c.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                c.neighborhood,
                c.rooms != null ? `${c.rooms} חדרים` : null,
                c.size_sqm != null ? `${c.size_sqm} מ״ר` : null,
                c.price != null ? formatListingPrice(c.price) : null,
              ]
                .filter(Boolean)
                .join(" · ") || "אין פרטים נוספים"}
            </p>
            {c.match_reason && (
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                {c.match_reason}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <a
                href={c.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center rounded-xl border border-primary/30 py-2 text-xs font-bold text-primary"
              >
                {t.properties.web.source}
              </a>
              <a
                {...waProps(
                  `שלום ${agentName}, מצאתי דרך האתר מודעה שמעניינת אותי ואשמח שתבדקו אותה עבורי:\n${c.title}\n${c.source_url}`,
                  agentPhone,
                )}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-whatsapp py-2 text-xs font-bold text-whatsapp-foreground"
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                {t.properties.web.talk}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
