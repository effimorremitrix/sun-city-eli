import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import type * as LeafletNS from "leaflet";
import { formatListingPrice, listingImage, type Listing } from "@/lib/listings";
import { SITE_CONFIG } from "@/lib/site-data";
import { mapValue, useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

/* ============================================================
 * מפת הנכסים — כל נכס כנעץ, ריחוף פותח חלון עם פרטי המודעה.
 *
 * Leaflet נטען דינמית ומופעל רק בצד הלקוח: הוא ניגש ל-window כבר בייבוא,
 * ולכן ייבוא סטטי היה שובר את הרינדור בשרת.
 * ============================================================ */

type Props = {
  listings: Listing[];
  /** פתיחת מודל הנכס — אותו מודל שנפתח מכרטיס ברשימה */
  onOpen: (listing: Listing) => void;
};

/** מרכז ברירת המחדל כשאין אף נכס ממוקם — משרד סאן סיטי */
const FALLBACK_CENTER: [number, number] = [SITE_CONFIG.coords.lat, SITE_CONFIG.coords.lng];

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * רמז למנהל כשאף נכס לא ממוקם: קישור להשלמת המיקומים באזור הניהול.
 * קומפוננטה נפרדת כדי ש-useAuth (בדיקת התחברות מול השרת) ירוץ רק במצב
 * הריק הזה, ולא בכל טעינה של המפה הציבורית.
 */
function AdminBackfillHint() {
  const { t } = useLang();
  const { user } = useAuth();
  if (!user?.isAdmin && !user?.isAgent) return null;
  return (
    <p className="mt-2 text-sm">
      <Link to="/account" search={{ tab: "listings" }} className="font-semibold underline">
        {t.properties.mapNoLocationAdminHint}
      </Link>
    </p>
  );
}

export function PropertyMap({ listings, onOpen }: Props) {
  const { lang, t } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  // ה-props האחרונים, כדי שה-effect ירוץ מחדש בלי לבנות את המפה מאפס
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const located = listings.filter(
    (l): l is Listing & { lat: number; lng: number } => l.lat != null && l.lng != null,
  );
  const missing = listings.length - located.length;
  // מפתח יציב לרשימת הנעצים — משמש כתלות ה-effect
  const key = located.map((l) => `${l.id}:${l.lat},${l.lng}`).join("|");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let map: LeafletNS.Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const markers: LeafletNS.Marker[] = [];
      for (const listing of located) {
        const price = formatListingPrice(listing.price, lang);
        const icon = L.divIcon({
          className: "map-pin-icon",
          html: `<span class="map-pin">${escapeHtml(price)}</span>`,
          // בלי iconSize הנעץ מקבל את גודל התווית עצמה, ולכן שטח הריחוף
          // חופף למה שרואים. גודל קבוע היה משאיר את הריחוף במקום אחר.
          iconSize: undefined,
        });
        const marker = L.marker([listing.lat, listing.lng], {
          icon,
          title: listing.title,
          keyboard: true,
        }).addTo(map);

        const img = listingImage(listing);
        const hood = mapValue(t.maps.neighborhoods, listing.neighborhood);
        const specs = [
          listing.rooms == null ? null : `${listing.rooms} ${t.properties.roomsUnit}`,
          listing.size_sqm == null ? null : t.properties.sqmValue(listing.size_sqm),
        ]
          .filter(Boolean)
          .join(" · ");

        marker.bindPopup(
          `<article class="map-card">
            ${img ? `<img src="${escapeHtml(img)}" alt="" class="map-card-img" />` : ""}
            <p class="map-card-title">${escapeHtml(listing.title)}</p>
            <p class="map-card-meta">${escapeHtml([hood ?? "", specs].filter(Boolean).join(" · "))}</p>
            <p class="map-card-price">${escapeHtml(price)}</p>
            <button type="button" class="map-card-btn">${escapeHtml(t.properties.mapOpenListing)}</button>
          </article>`,
          { closeButton: true, minWidth: 200, autoPan: true },
        );

        // ריחוף פותח את החלון, כמו ב-booking/airbnb; במגע הלחיצה עושה זאת ממילא
        marker.on("mouseover", () => marker.openPopup());
        marker.on("popupopen", () => {
          const btn = marker.getPopup()?.getElement()?.querySelector(".map-card-btn");
          btn?.addEventListener("click", () => onOpenRef.current(listing), { once: true });
        });
        markers.push(marker);
      }

      if (markers.length) {
        map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40], maxZoom: 16 });
      } else {
        map.setView(FALLBACK_CENTER, 13);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang]);

  if (!located.length) {
    return (
      <div className="soft-card mt-4 p-6 text-center">
        <p className="font-bold text-primary">{t.properties.mapNoLocation}</p>
        {listings.length > 0 && <AdminBackfillHint />}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div
        ref={containerRef}
        role="application"
        aria-label={t.properties.viewMap}
        className="h-[28rem] w-full overflow-hidden rounded-2xl border border-border"
      />
      {missing > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t.properties.mapMissingCount(missing)}
        </p>
      )}
    </div>
  );
}
