import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
  Store,
  Target,
  UserRound,
  X,
} from "lucide-react";
import {
  getMyPortalExtras,
  type PortalMarketMatch,
  type PortalMatch,
} from "@/lib/account.functions";
import { setListingFeedback, type FeedbackReaction } from "@/lib/feedback.functions";
import { requestMarketCallback } from "@/lib/leads.functions";
import { listPublicListings } from "@/lib/listings.functions";
import { listPublicMarketListings } from "@/lib/market.functions";
import {
  aiSearchListings,
  type AiLimitReason,
  type AiSearchResult,
} from "@/lib/ai-search.functions";
import { formatListingPrice, listingImages, localizeListing, type Listing } from "@/lib/listings";
import { marketSourceLabel, type MarketListing } from "@/lib/market";
import type { MatchResult } from "@/lib/match-score";
import { getBackToSiteHref } from "@/lib/back-to-site";
import { waProps } from "@/lib/site-data";
import { useLang, type Dict } from "@/lib/i18n";

/** הודעת חסימה של החיפוש החכם בשפת הדף (spend = תקרת הוצאה → "לא זמין") */
const aiLimitMessage = (t: Dict, reason: AiLimitReason): string => {
  if (reason === "daily") return t.limits.aiDaily;
  if (reason === "burst") return t.limits.aiBurst;
  if (reason === "blocked") return t.limits.blocked;
  return t.limits.aiDisabled;
};

/* ============================================================
 * מדורי האזור האישי של הלקוח: התאמות עם אחוז התאמה ופירוט,
 * משוב ❤️/❌/⭐/📞, נכסים שמורים, וכרטיס הסוכן המטפל.
 * ============================================================ */

/** תגית פירוט של קריטריון התאמה — ✓ ירוק, ~ צהוב ("מחיר מעט מעל התקציב"), ✗ אפור */
function CriterionChip({ label, level }: { label: string; level: "full" | "near" | "miss" }) {
  const { t } = useLang();
  const cls =
    level === "full"
      ? "bg-whatsapp/15 text-primary"
      : level === "near"
        ? "bg-sun/20 text-primary"
        : "bg-muted text-muted-foreground line-through";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {level === "full" ? "✓ " : level === "near" ? "~ " : "✗ "}
      {label}
      {level === "near" ? ` (${t.portal.matchNear})` : ""}
    </span>
  );
}

function ListingCover({ listing }: { listing: Listing }) {
  const src = listingImages(listing)[0] ?? null;
  if (!src) return <div className="size-20 shrink-0 rounded-xl bg-secondary" />;
  return (
    <img
      src={src}
      alt={listing.title}
      loading="lazy"
      className="size-20 shrink-0 rounded-xl object-cover"
    />
  );
}

/** שורת כפתורי המשוב על נכס — משותפת להתאמות ולמועדפים */
function FeedbackButtons({
  listing,
  reactions,
  onChanged,
  onMessage,
}: {
  listing: Listing;
  reactions: string[];
  onChanged: () => void;
  onMessage: (msg: string) => void;
}) {
  const { t } = useLang();
  const sendFeedback = useServerFn(setListingFeedback);
  const [busy, setBusy] = useState<FeedbackReaction | null>(null);

  const toggle = async (reaction: FeedbackReaction, okMsg: string) => {
    if (busy) return;
    setBusy(reaction);
    try {
      const on = !reactions.includes(reaction);
      await sendFeedback({ data: { listingId: listing.id, reaction, on } });
      if (on) onMessage(okMsg);
      onChanged();
    } catch {
      // משוב הוא best-effort בצד הלקוח — הכפתור פשוט לא משתנה
    } finally {
      setBusy(null);
    }
  };

  const chip = (active: boolean) =>
    `flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
      active ? "bg-sun text-sun-foreground" : "border border-border text-muted-foreground"
    }`;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={busy != null}
        className={chip(reactions.includes("interested"))}
        onClick={() => void toggle("interested", t.portal.fbUpdated)}
      >
        <Heart className="size-3.5" aria-hidden="true" />
        {t.portal.fbInterested}
      </button>
      <button
        type="button"
        disabled={busy != null}
        className={chip(reactions.includes("not_relevant"))}
        onClick={() => void toggle("not_relevant", t.portal.fbUpdated)}
      >
        <X className="size-3.5" aria-hidden="true" />
        {t.portal.fbNotRelevant}
      </button>
      <button
        type="button"
        disabled={busy != null}
        className={chip(reactions.includes("favorite"))}
        onClick={() => void toggle("favorite", t.portal.fbSavedMsg)}
      >
        <Star className="size-3.5" aria-hidden="true" />
        {reactions.includes("favorite") ? t.portal.fbSaved : t.portal.fbSave}
      </button>
      <button
        type="button"
        disabled={busy != null}
        className={chip(reactions.includes("callback"))}
        onClick={() => void toggle("callback", t.portal.fbCallbackOk)}
      >
        <Phone className="size-3.5" aria-hidden="true" />
        {t.portal.fbCallback}
      </button>
    </div>
  );
}

function MatchCard({
  item,
  reactions,
  onChanged,
  onMessage,
}: {
  item: PortalMatch;
  reactions: string[];
  onChanged: () => void;
  onMessage: (msg: string) => void;
}) {
  const { t } = useLang();
  const { listing, match } = item;
  const shown = match.breakdown.filter((c) => c.level !== "unknown");
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <ListingCover listing={listing} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-primary">{listing.title}</p>
            {match.score != null && (
              <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-extrabold text-sun-foreground">
                {t.portal.matchBadge(match.score)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {listing.neighborhood
              ? (t.maps.neighborhoods[listing.neighborhood] ?? listing.neighborhood)
              : t.misc.noInfo}{" "}
            · {formatListingPrice(listing.price)} · {t.portal.viaProfile(item.profileLabel)}
          </p>
          {shown.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1">
              {shown.map((c) => (
                <CriterionChip
                  key={c.key}
                  label={t.portal.matchCriteria[c.key] ?? c.key}
                  level={c.level as "full" | "near" | "miss"}
                />
              ))}
            </p>
          )}
          <div className="mt-1.5 text-sm">
            <a
              href={`${getBackToSiteHref()}?listing=${listing.id}#properties`}
              className="underline"
            >
              {t.portal.viewOnSite}
            </a>
          </div>
          <FeedbackButtons
            listing={listing}
            reactions={reactions}
            onChanged={onChanged}
            onMessage={onMessage}
          />
        </div>
      </div>
    </li>
  );
}

/**
 * כרטיס מודעה מהשוק (לוח חיצוני) — תגית מקור, אחוז התאמה, קישור למודעה
 * המקורית ושני כפתורים שיוצרים ליד אצל הסוכן המטפל: "רוצה שסוכן יחזור
 * אליי" ו"מעניין אותי". אין listing_feedback למודעות שוק — לכן הפעולה
 * עוברת דרך requestMarketCallback.
 */
function MarketMatchCard({
  listing,
  match,
  profileLabel,
  onMessage,
}: {
  listing: MarketListing;
  match?: MatchResult | null;
  profileLabel?: string | null;
  onMessage: (msg: string) => void;
}) {
  const { t, lang } = useLang();
  const request = useServerFn(requestMarketCallback);
  const [busy, setBusy] = useState<"callback" | "interest" | null>(null);
  const [done, setDone] = useState<Set<"callback" | "interest">>(() => new Set());

  const act = async (kind: "callback" | "interest") => {
    if (busy || done.has(kind)) return;
    setBusy(kind);
    try {
      await request({ data: { marketListingId: listing.id, kind } });
      setDone((prev) => new Set(prev).add(kind));
      onMessage(t.portal.fbCallbackOk);
    } catch {
      // best-effort — הכפתור פשוט לא משתנה
    } finally {
      setBusy(null);
    }
  };

  const chip = (active: boolean) =>
    `flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
      active ? "bg-sun text-sun-foreground" : "border border-border text-muted-foreground"
    }`;

  const shown = (match?.breakdown ?? []).filter((c) => c.level !== "unknown");

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="size-20 shrink-0 rounded-xl bg-secondary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-primary">{listing.title}</p>
            {match?.score != null && (
              <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-extrabold text-sun-foreground">
                {t.portal.matchBadge(match.score)}
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
              {t.portal.marketTag}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
              {marketSourceLabel(listing)}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {listing.neighborhood
              ? (t.maps.neighborhoods[listing.neighborhood] ?? listing.neighborhood)
              : t.misc.noInfo}{" "}
            · {formatListingPrice(listing.price, lang)}
            {listing.rooms != null ? ` · ${listing.rooms} ${t.properties.roomsUnit}` : ""}
            {profileLabel ? ` · ${t.portal.viaProfile(profileLabel)}` : ""}
          </p>
          {shown.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1">
              {shown.map((c) => (
                <CriterionChip
                  key={c.key}
                  label={t.portal.matchCriteria[c.key] ?? c.key}
                  level={c.level as "full" | "near" | "miss"}
                />
              ))}
            </p>
          )}
          <div className="mt-1.5 text-sm">
            <a
              href={listing.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t.portal.marketSource}
            </a>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy != null || done.has("callback")}
              className={chip(done.has("callback"))}
              onClick={() => void act("callback")}
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {t.portal.fbCallback}
            </button>
            <button
              type="button"
              disabled={busy != null || done.has("interest")}
              className={chip(done.has("interest"))}
              onClick={() => void act("interest")}
            >
              <Heart className="size-3.5" aria-hidden="true" />
              {t.portal.fbInterested}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * חיפוש חכם בכל השוק — לאזור האישי של הלקוח: טקסט חופשי → פילטרים → נכסי
 * המשרד + מודעות מהשוק שתואמות. בלי סריקה חיה (includeWeb=false) — זו
 * נשארת בדף הציבורי כדי לא לבזבז את המכסה היומית מהפורטל.
 */
export function PortalAiSearch({ onMessage }: { onMessage: (msg: string) => void }) {
  const { t, lang } = useLang();
  const search = useServerFn(aiSearchListings);
  const fetchListings = useServerFn(listPublicListings);
  const fetchMarket = useServerFn(listPublicMarketListings);
  const [query, setQuery] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<AiSearchResult | null>(null);

  // הרשימות המלאות נטענות פעם אחת, רק אחרי החיפוש הראשון
  const listings = useQuery({
    queryKey: ["portal-public-listings"],
    queryFn: () => fetchListings(),
    enabled: res != null,
    staleTime: 5 * 60 * 1000,
  });
  const market = useQuery({
    queryKey: ["portal-market-listings"],
    queryFn: () => fetchMarket({ data: { limit: 300 } }),
    enabled: res != null,
    staleTime: 5 * 60 * 1000,
  });

  const office = res
    ? (listings.data ?? [])
        .filter((l) => res.ids.includes(l.id))
        .map((l) => localizeListing(l, lang))
    : [];
  const marketHits = res ? (market.data ?? []).filter((m) => res.marketIds.includes(m.id)) : [];
  const loaded = res != null && !listings.isLoading && !market.isLoading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await search({ data: { query, lang, includeWeb: false, website } });
      if (r.limited) {
        setRes(null);
        setErr(aiLimitMessage(t, r.limited));
        return;
      }
      setRes(r);
    } catch (e) {
      setRes(null);
      setErr(e instanceof Error ? e.message : t.properties.aiFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <Sparkles className="size-5 text-sun" aria-hidden="true" />
        {t.portal.aiSearchTitle}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t.portal.aiSearchHint}</p>
      <form onSubmit={submit} noValidate className="relative mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -start-[9999px] top-0 h-px w-px opacity-0"
        />
        <input
          className="field min-w-0 flex-1"
          value={query}
          maxLength={300}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.properties.aiPlaceholder}
          aria-label={t.properties.aiAria}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-60"
        >
          {busy ? t.properties.aiSearching : t.properties.aiSearch}
        </button>
      </form>
      {err && (
        <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {err}
        </p>
      )}
      {res && (
        <p
          className="mt-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground"
          aria-live="polite"
        >
          {res.explanation || t.properties.aiFallbackExplain}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{t.properties.aiDisclaimer}</p>

      {res && !loaded && <p className="mt-3 text-sm text-muted-foreground">{t.portal.loading}</p>}
      {loaded && office.length === 0 && marketHits.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{t.portal.aiNoResults}</p>
      )}

      {loaded && office.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-extrabold text-primary">
            {t.portal.aiOfficeResults} ({office.length})
          </h3>
          <ul className="mt-2 grid gap-3">
            {office.map((listing) => (
              <li key={listing.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-3">
                  <ListingCover listing={listing} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-primary">{listing.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {listing.neighborhood
                        ? (t.maps.neighborhoods[listing.neighborhood] ?? listing.neighborhood)
                        : t.misc.noInfo}{" "}
                      · {formatListingPrice(listing.price, lang)}
                      {listing.rooms != null ? ` · ${listing.rooms} ${t.properties.roomsUnit}` : ""}
                    </p>
                    <div className="mt-1.5 text-sm">
                      <a
                        href={`${getBackToSiteHref()}?listing=${listing.id}#properties`}
                        className="underline"
                      >
                        {t.portal.viewOnSite}
                      </a>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {loaded && marketHits.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-extrabold text-primary">
            {t.portal.aiMarketResults} ({marketHits.length})
          </h3>
          <ul className="mt-2 grid gap-3">
            {marketHits.map((m) => (
              <MarketMatchCard key={m.id} listing={m} onMessage={onMessage} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** כל מדורי הפורטל המורחבים — התאמות, שמורים והסוכן המטפל */
export function PortalExtrasSections({ onMessage }: { onMessage: (msg: string) => void }) {
  const { t } = useLang();
  const fetchExtras = useServerFn(getMyPortalExtras);
  const extras = useQuery({ queryKey: ["portal-extras"], queryFn: () => fetchExtras() });

  const refresh = () => void extras.refetch();
  const feedback = extras.data?.feedback ?? {};
  const agent = extras.data?.agent ?? null;

  return (
    <>
      {/* הסוכן המטפל — שם, תמונה, וואטסאפ וטלפון ישירים */}
      {agent && (
        <section className="soft-card mt-6 p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
            <UserRound className="size-5 text-sun" aria-hidden="true" />
            {t.portal.agentCardTitle}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {agent.photoUrl ? (
              <img
                src={agent.photoUrl}
                alt={agent.name}
                className="size-16 rounded-full border-2 border-sun object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
                <UserRound className="size-8 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-primary">{agent.name}</p>
              {agent.slug && (
                <a href={`/${agent.slug}`} className="text-xs underline">
                  {t.portal.agentSiteLink}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {agent.phoneTel && (
                <a
                  {...waProps(`${t.floatingWa.waMsg(agent.name)}`, agent.phoneTel)}
                  className="flex items-center gap-1.5 rounded-xl bg-whatsapp px-4 py-2 text-sm font-bold text-whatsapp-foreground"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              {agent.phoneTel && (
                <a
                  href={`tel:${agent.phoneTel}`}
                  className="flex items-center gap-1.5 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {agent.phone ?? ""}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* התאמות עם אחוז התאמה */}
      <section className="soft-card mt-6 p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Target className="size-5 text-sun" aria-hidden="true" />
          {t.portal.matchesTitle}
        </h2>
        {extras.isLoading && (
          <p className="mt-2 text-sm text-muted-foreground">{t.portal.loading}</p>
        )}
        {!extras.isLoading && (extras.data?.matches ?? []).length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{t.portal.noMatches}</p>
        )}
        <ul className="mt-3 grid gap-3">
          {(extras.data?.matches ?? []).map((m) => (
            <MatchCard
              key={m.listing.id}
              item={m}
              reactions={feedback[m.listing.id] ?? []}
              onChanged={refresh}
              onMessage={onMessage}
            />
          ))}
        </ul>
      </section>

      {/* התאמות מהשוק — מודעות מלוחות אחרים שתואמות לפרופיל */}
      <section className="soft-card mt-6 p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Store className="size-5 text-sun" aria-hidden="true" />
          {t.portal.marketMatchesTitle}
        </h2>
        {extras.isLoading && (
          <p className="mt-2 text-sm text-muted-foreground">{t.portal.loading}</p>
        )}
        {!extras.isLoading && (extras.data?.marketMatches ?? []).length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{t.portal.noMarketMatches}</p>
        )}
        <ul className="mt-3 grid gap-3">
          {(extras.data?.marketMatches ?? []).map((m: PortalMarketMatch) => (
            <MarketMatchCard
              key={m.listing.id}
              listing={m.listing}
              match={m.match}
              profileLabel={m.profileLabel}
              onMessage={onMessage}
            />
          ))}
        </ul>
      </section>

      {/* נכסים שמורים */}
      <section className="soft-card mt-6 p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Star className="size-5 text-sun" aria-hidden="true" />
          {t.portal.favoritesTitle}
        </h2>
        {!extras.isLoading && (extras.data?.favorites ?? []).length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{t.portal.noFavorites}</p>
        )}
        <ul className="mt-3 grid gap-3">
          {(extras.data?.favorites ?? []).map((listing) => (
            <li key={listing.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start gap-3">
                <ListingCover listing={listing} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary">{listing.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {listing.neighborhood
                      ? (t.maps.neighborhoods[listing.neighborhood] ?? listing.neighborhood)
                      : t.misc.noInfo}{" "}
                    · {formatListingPrice(listing.price)}
                  </p>
                  <div className="mt-1.5 text-sm">
                    <a
                      href={`${getBackToSiteHref()}?listing=${listing.id}#properties`}
                      className="underline"
                    >
                      {t.portal.viewOnSite}
                    </a>
                  </div>
                  <FeedbackButtons
                    listing={listing}
                    reactions={feedback[listing.id] ?? []}
                    onChanged={refresh}
                    onMessage={onMessage}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
