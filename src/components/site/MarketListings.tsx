import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  ExternalLink,
  MapPin,
  MessageCircle,
  PhoneCall,
  Ruler,
  Store,
} from "lucide-react";
import { marketSourceLabel, type MarketListing } from "@/lib/market";
import { formatListingPrice } from "@/lib/listings";
import { createPublicLead } from "@/lib/leads.functions";
import { isValidIsraeliPhone } from "@/lib/leads";
import { openWa } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { mapValue, useLang } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

/* ============================================================
 * "נכסים נוספים מהשוק" — מודעות אמיתיות מלוחות אחרים (יד2, קומו, מדלן...)
 * שנסרקו עבור הלקוחות. הפנייה עוברת תמיד דרך סוכן סאן סיטי של הדף:
 * "רוצה שסוכן יחזור אליי" פותח טופס קטן (שם + טלפון) שנקלט כליד ופותח
 * וואטסאפ לסוכן עם קישור למודעה המקורית.
 * ============================================================ */

const PAGE_SIZE = 24;

/** מזהה הסשן האנונימי של המדידה — לקישור הליד לביקור (best-effort) */
function readSessionId(): string | null {
  try {
    return localStorage.getItem("suncity:session-id");
  } catch {
    return null;
  }
}

export const MARKET_SECTION_ID = "market-listings";

type Props = {
  listings: MarketListing[];
  /** מודעה להדגשה (קישור עמוק ?market=<id>) */
  highlightId?: string | null;
};

export function MarketListings({ listings, highlightId = null }: Props) {
  const { t } = useLang();
  const [shown, setShown] = useState(PAGE_SIZE);

  // המודעה המודגשת תמיד ראשונה — כדי שתהיה גלויה גם כשהרשימה ארוכה
  const ordered = useMemo(() => {
    if (!highlightId) return listings;
    const hit = listings.find((m) => m.id === highlightId);
    if (!hit) return listings;
    return [hit, ...listings.filter((m) => m.id !== highlightId)];
  }, [listings, highlightId]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`market-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, ordered.length]);

  if (listings.length === 0) return null;

  const visible = ordered.slice(0, shown);

  return (
    <section id={MARKET_SECTION_ID} className="mt-10" aria-label={t.market.title}>
      <h3 className="flex items-center gap-1.5 text-xl font-extrabold text-primary">
        <Store className="size-5 text-sun" aria-hidden="true" />
        {t.market.title}
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.market.subtitle}</p>
      <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
        {t.market.found(listings.length)}
      </p>

      <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => (
          <li key={m.id} id={`market-${m.id}`} className="h-full">
            <MarketCard listing={m} highlighted={m.id === highlightId} />
          </li>
        ))}
      </ul>

      {shown < ordered.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          className="mt-5 block w-full rounded-xl border border-primary/30 py-3 text-sm font-bold text-primary sm:mx-auto sm:w-auto sm:px-8"
        >
          {t.market.showMore}
        </button>
      )}
    </section>
  );
}

export function MarketCard({
  listing: m,
  highlighted = false,
}: {
  listing: MarketListing;
  highlighted?: boolean;
}) {
  const { t, lang } = useLang();
  const { business: live, siteId } = useLive();
  const createLead = useServerFn(createPublicLead);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // צפייה במודעה מהשוק — נספרת פעם אחת לכרטיס (מקור או טופס חזרה)
  const viewedRef = useRef(false);
  const trackView = () => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackEvent("market_view", siteId, null);
  };

  const noInfo = t.misc.noInfo;
  const hood = mapValue(t.maps.neighborhoods, m.neighborhood);
  const price = formatListingPrice(m.price, lang);
  const source = marketSourceLabel(m);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.properties.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(t.misc.phoneError);
    setErr(null);
    // קליטה שקטה כליד אצל הסוכן — עם המודעה מהשוק שבגללה הלקוח פנה
    try {
      void createLead({
        data: {
          siteId,
          name: form.name,
          phone: form.phone,
          source: "התעניינות בנכס",
          marketListingId: m.id,
          sessionId: readSessionId(),
        },
      }).catch(() => {});
    } catch {
      /* קליטת ליד היא Best-effort */
    }
    trackEvent("lead_submit", siteId);
    setSent(true);
    setFormOpen(false);
    openWa(t.market.waMsg(live.agentName, m.title, m.source_url), live.phoneTel);
  };

  return (
    <article
      className={`soft-card flex h-full flex-col overflow-hidden ${
        highlighted ? "ring-2 ring-sun" : ""
      }`}
    >
      {m.image_url && (
        <img
          src={m.image_url}
          alt={m.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-[3/2] w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
            {t.market.tag}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
            {source}
          </span>
          {m.match_score != null && (
            <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-extrabold text-sun-foreground">
              {t.market.match(m.match_score)}
            </span>
          )}
        </div>
        <p className="mt-2 font-display text-xl font-extrabold text-primary">{price}</p>
        <h4 className="mt-1 line-clamp-2 min-h-12 text-base">{m.title}</h4>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-sun" aria-hidden="true" />
          {hood ?? noInfo}, {t.maps.cities[m.city] ?? m.city}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          <li className="flex items-center gap-1">
            <BedDouble className="size-4 text-sun" aria-hidden="true" />
            {m.rooms ?? noInfo} {t.properties.roomsUnit}
          </li>
          <li className="flex items-center gap-1">
            <Ruler className="size-4 text-sun" aria-hidden="true" />
            {m.size_sqm ?? noInfo} {t.properties.sqm}
          </li>
        </ul>

        {sent && (
          <p className="mt-3 rounded-xl bg-secondary p-2.5 text-xs font-semibold text-primary">
            {t.market.callbackSent}
          </p>
        )}

        {formOpen && !sent && (
          <form onSubmit={submit} noValidate className="mt-3 rounded-xl bg-secondary p-3">
            <div className="grid gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.properties.fullName}
                </span>
                <input
                  className="field py-2 text-sm"
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
                  className="field py-2 text-sm"
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
              <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                {err}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp py-2 text-sm font-bold text-whatsapp-foreground"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {t.market.send}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-primary/30 px-3 py-2 text-sm font-bold text-primary"
              >
                {t.market.cancel}
              </button>
            </div>
          </form>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          <a
            href={m.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackView}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t.market.source}
          </a>
          {!sent && (
            <button
              type="button"
              onClick={() => {
                if (!formOpen) trackView();
                setFormOpen((o) => !o);
              }}
              aria-expanded={formOpen}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sun py-2.5 text-sm font-bold text-sun-foreground"
            >
              <PhoneCall className="size-4" aria-hidden="true" />
              {t.market.callback}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
