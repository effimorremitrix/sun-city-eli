import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, MessageCircle, Phone, Star, Target, UserRound, X } from "lucide-react";
import { getMyPortalExtras, type PortalMatch } from "@/lib/account.functions";
import { setListingFeedback, type FeedbackReaction } from "@/lib/feedback.functions";
import { formatListingPrice, listingImages, type Listing } from "@/lib/listings";
import { getBackToSiteHref } from "@/lib/back-to-site";
import { waProps } from "@/lib/site-data";
import { useLang } from "@/lib/i18n";

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
