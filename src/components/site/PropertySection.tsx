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
  listingImages,
  matchesFilters,
  type Listing,
  type ListingFilters,
} from "@/lib/listings";

import { aiSearchListings } from "@/lib/ai-search.functions";
import { isValidIsraeliPhone } from "@/lib/leads";
import { mapValue, useLang } from "@/lib/i18n";
import { Reveal } from "./Reveal";

const featureIcons = {
  has_mamad: { key: "mamad", Icon: ShieldCheck },
  has_elevator: { key: "elevator", Icon: MoveVertical },
  has_parking: { key: "parking", Icon: Car },
  has_balcony: { key: "balcony", Icon: Trees },
} as const;

type Props = { listings: Listing[]; updatedAt: string | null };

export function PropertySection({ listings, updatedAt }: Props) {
  const { t } = useLang();
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
      setAi({ ids: res.ids, explanation: res.explanation, filters: res.filters });
    } catch (err) {
      setAi(null);
      setAiErr(err instanceof Error ? err.message : t.properties.aiFailed);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section id="properties" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.properties.kicker}</p>
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
            aria-label={t.properties.aiAria}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={aiBusy}
            className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-60"
          >
            {aiBusy ? t.properties.aiSearching : t.properties.aiSearch}
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
            {ai.explanation || t.properties.aiFallbackExplain}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t.properties.aiDisclaimer}</p>
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
            aria-label={t.properties.filterDealAria}
          >
            <option value="all">{t.properties.filterAll}</option>
            <option value="מכירה">{t.maps.deal["מכירה"]}</option>
            <option value="השכרה">{t.maps.deal["השכרה"]}</option>
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
            aria-label={t.properties.filterRoomsAria}
          >
            <option value="all">{t.properties.filterAll}</option>
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
            aria-label={t.properties.filterPriceAria}
          >
            <option value="all">{t.properties.filterAll}</option>
            {priceRanges.map((r, i) => (
              <option key={r.label} value={String(i)}>
                {t.properties.priceRanges[i] ?? r.label}
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
            aria-label={t.properties.filterAreaAria}
          >
            <option value="all">{t.properties.allAreas}</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {t.maps.neighborhoods[n] ?? n}
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
          {t.properties.personalAgent}
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
          <p className="font-bold text-primary">{t.properties.noResultsTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.properties.noResultsText}</p>
          <a
            {...waProps(t.properties.waNoResultsMsg)}
            className="mt-4 inline-block rounded-xl bg-whatsapp px-5 py-3 text-sm font-bold text-whatsapp-foreground"
          >
            {t.properties.waNoResultsBtn}
          </a>
        </div>
      )}

      <a
        href={business.yad2Url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-soft"
      >
        {t.properties.yad2Btn}
      </a>

      {selected && <PropertyModal property={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function PropertyCard({ property: p, onOpen }: { property: Listing; onOpen: () => void }) {
  const { lang, t } = useLang();
  const gallery = listingImages(p);
  const img = gallery[0] ?? null;
  const noInfo = t.misc.noInfo;
  const hood = mapValue(t.maps.neighborhoods, p.neighborhood);
  const city = t.maps.cities[p.city] ?? p.city;
  const price = formatListingPrice(p.price, lang);

  return (
    <article className="soft-card flex h-full flex-col overflow-hidden">
      <div className="relative">
        {img ? (
          <img
            src={img}
            alt={t.properties.cardImgAlt(p.title, hood ?? city)}
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
          <span className="absolute top-3 start-3 rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground">
            {t.maps.tag[p.tag] ?? p.tag}
          </span>
        )}
        {gallery.length > 1 && (
          <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-full bg-primary/85 px-2.5 py-1 text-xs font-bold text-primary-foreground">
            <Images className="size-3.5" aria-hidden="true" />
            {t.properties.photosCount(gallery.length)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-xl font-extrabold text-primary">{price}</p>
        <h3 className="mt-1 text-base">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-sun" aria-hidden="true" />
          {hood ?? noInfo}, {city}
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          <li className="flex items-center gap-1">
            <BedDouble className="size-4 text-sun" aria-hidden="true" />
            {p.rooms ?? noInfo} {t.properties.roomsUnit}
          </li>
          <li className="flex items-center gap-1">
            <Ruler className="size-4 text-sun" aria-hidden="true" />
            {p.size_sqm ?? noInfo} {t.properties.sqm}
          </li>
          <li className="flex items-center gap-1">
            <Building className="size-4 text-sun" aria-hidden="true" />
            {t.properties.floorLabel(p.floor ?? noInfo)}
          </li>
        </ul>

        <ul className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(featureIcons) as Array<keyof typeof featureIcons>)
            .filter((key) => p[key])
            .map((key) => {
              const { key: labelKey, Icon } = featureIcons[key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {t.properties.features[labelKey]}
                </li>
              );
            })}
        </ul>

        <div className="mt-4 flex gap-2 pt-1">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
          >
            {t.properties.detailsBtn}
          </button>
          <a
            {...waProps(
              t.properties.waListing(business.name, p.title, p.address ?? hood ?? "", price),
            )}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t.properties.waDetailsBtn}
          </a>
        </div>
      </div>
    </article>
  );
}

function PropertyModal({ property: p, onClose }: { property: Listing; onClose: () => void }) {
  const { lang, dir, t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const gallery = listingImages(p);
  const [index, setIndex] = useState(0);

  const noInfo = t.misc.noInfo;
  const hood = mapValue(t.maps.neighborhoods, p.neighborhood);
  const city = t.maps.cities[p.city] ?? p.city;
  const price = formatListingPrice(p.price, lang);

  const next = () => setIndex((i) => (i + 1) % gallery.length);
  const prev = () => setIndex((i) => (i - 1 + gallery.length) % gallery.length);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.properties.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(t.misc.phoneError);
    setErr(null);
    openWa(
      t.properties.waInterested(business.name, {
        title: p.title,
        hood: hood ?? noInfo,
        price,
        name: form.name,
        phone: form.phone,
      }),
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.properties.modalAria(p.title)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[oklch(0.263_0.038_260/0.6)] p-0 sm:items-center sm:p-4"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <h3 className="text-lg">{p.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.properties.closeModalAria}
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
                  alt={t.properties.galleryImgAlt(p.title, hood ?? city, index + 1, gallery.length)}
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-xl object-cover"
                />
                {gallery.length > 1 && (
                  <>
                    {/* החיצים פיזיים: החץ השמאלי תמיד מציג את השכן משמאל, בהתאם לכיוון השפה */}
                    <button
                      type="button"
                      onClick={dir === "rtl" ? next : prev}
                      aria-label={
                        dir === "rtl" ? t.properties.nextImgAria : t.properties.prevImgAria
                      }
                      className="absolute top-1/2 left-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-primary shadow"
                    >
                      <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={dir === "rtl" ? prev : next}
                      aria-label={
                        dir === "rtl" ? t.properties.prevImgAria : t.properties.nextImgAria
                      }
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
                      aria-label={t.properties.showImgAria(i + 1)}
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

          <p className="mt-4 font-display text-2xl font-extrabold text-primary">{price}</p>
          <p className="mt-2 leading-relaxed text-foreground">{p.description ?? noInfo}</p>

          <table className="mt-4 w-full text-start text-sm">
            <caption className="sr-only">{t.properties.specCaption}</caption>
            <tbody className="divide-y divide-border">
              {[
                [t.properties.specDeal, t.maps.deal[p.deal_type] ?? p.deal_type],
                [t.properties.specAddress, p.address ?? noInfo],
                [t.properties.specRooms, p.rooms == null ? noInfo : String(p.rooms)],
                [
                  t.properties.specSize,
                  p.size_sqm == null ? noInfo : t.properties.sqmValue(p.size_sqm),
                ],
                [t.properties.specFloor, p.floor ?? noInfo],
                [t.properties.features.mamad, p.has_mamad ? t.properties.yes : t.properties.no],
                [
                  t.properties.features.elevator,
                  p.has_elevator ? t.properties.yes : t.properties.no,
                ],
                [t.properties.features.parking, p.has_parking ? t.properties.yes : t.properties.no],
                [t.properties.features.balcony, p.has_balcony ? t.properties.yes : t.properties.no],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" className="py-2 text-start font-semibold text-muted-foreground">
                    {k}
                  </th>
                  <td className="py-2 text-start">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {p.neighborhood && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <iframe
                title={t.properties.mapTitle(hood ?? p.neighborhood, city)}
                src={`https://www.google.com/maps?q=${encodeURIComponent(`${p.neighborhood}, ${p.city}`)}&output=embed`}
                loading="lazy"
                className="h-56 w-full"
              />
            </div>
          )}

          <form onSubmit={submit} className="mt-5 rounded-xl bg-secondary p-4" noValidate>
            <p className="font-display text-lg font-bold text-primary">
              {t.properties.interestedTitle}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.properties.fullName}
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
                  {t.properties.phone}
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
              {t.properties.sendWa}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
