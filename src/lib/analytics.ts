/**
 * ============================================================
 * מדידה עצמית בצד הלקוח — בלי סקריפטים חיצוניים ובלי מזהים אישיים.
 *
 * מזהה סשן אקראי נשמר ב-localStorage (מעורבל בצד השרת עם מלח לפני
 * שמירה במסד). כשל שליחה לעולם לא מפריע לגלישה — הכל fire-and-forget.
 * ============================================================
 */

export type TrackEventType =
  | "whatsapp_click"
  | "phone_click"
  | "property_view"
  | "market_view"
  | "lead_submit"
  | "login"
  | "search"
  | "ai_search"
  | "signup"
  | "interest"
  | "callback"
  | "agent_cta";

/** ה-site של הדף הנוכחי — נקבע ב-SiteLiveProvider, משמש כברירת מחדל לאירועים */
let currentSiteId: string | null = null;
export const setCurrentSiteId = (siteId: string | null) => {
  currentSiteId = siteId;
};

/** מזהה הסשן הגולמי (למסירה לשרת, למשל בהרשמה) — null כשאין אחסון */
export function currentSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

const SESSION_KEY = "suncity:session-id";
const SESSION_SEEN_KEY = "suncity:session-seen";

type SessionInfo = { id: string; isNew: boolean };

function sessionInfo(): SessionInfo | null {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    let isNew = false;
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
      isNew = true;
    }
    // "משתמש חוזר" = ביקור ביום אחר מזה שנרשם לאחרונה
    const today = new Date().toISOString().slice(0, 10);
    const seen = localStorage.getItem(SESSION_SEEN_KEY);
    if (seen !== today) {
      localStorage.setItem(SESSION_SEEN_KEY, today);
      if (seen != null) isNew = false;
    }
    return { id, isNew };
  } catch {
    return null; // אחסון חסום — מוותרים על מדידה
  }
}

function post(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    // sendBeacon שורד ניווט/סגירת טאב; fetch כגיבוי
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })))
      return;
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // מדידה לעולם לא שוברת את האתר
  }
}

/** צפיית עמוד — נקרא בכל ניווט בדפים הציבוריים */
export function trackPageView(siteId: string | null, lang: string) {
  const session = sessionInfo();
  if (!session) return;
  const params = new URLSearchParams(window.location.search);
  post({
    kind: "page_view",
    siteId,
    path: window.location.pathname,
    referrer: document.referrer || null,
    utmSource: params.get("utm_source"),
    utmCampaign: params.get("utm_campaign"),
    sessionId: session.id,
    isNewSession: session.isNew,
    lang,
    device: window.innerWidth < 768 ? "mobile" : "desktop",
  });
}

/** אירוע לחיצה/פעולה — וואטסאפ, טלפון, צפיית נכס, שליחת ליד וכו' */
export function trackEvent(type: TrackEventType, siteId: string | null, listingId?: string | null) {
  const session = sessionInfo();
  if (!session) return;
  post({
    kind: "event",
    type,
    siteId: siteId ?? currentSiteId,
    listingId: listingId ?? null,
    path: window.location.pathname,
    sessionId: session.id,
  });
}

/* ------------------------------------------------------------------
 * מדידת לחיצות וואטסאפ/טלפון בכל האתר — מאזין אחד ברמת המסמך במקום
 * trackEvent בכל כפתור: כל קישור tel: או wa.me / api.whatsapp.com נספר,
 * כולל אלה שנפתחים דרך openWa (ה-click מבעבע גם אחרי preventDefault).
 * ------------------------------------------------------------------ */
let clickTrackingInstalled = false;
let lastClickAt = 0;

export function installClickTracking() {
  if (clickTrackingInstalled || typeof document === "undefined") return;
  clickTrackingInstalled = true;
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      // מניעת ספירה כפולה של אותה לחיצה (למשל כפתור בתוך קישור)
      const now = Date.now();
      if (now - lastClickAt < 300) return;
      if (href.startsWith("tel:")) {
        lastClickAt = now;
        trackEvent("phone_click", null, anchor.dataset["listingId"] ?? null);
      } else if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) {
        lastClickAt = now;
        trackEvent("whatsapp_click", null, anchor.dataset["listingId"] ?? null);
      }
    },
    { capture: true },
  );
}
