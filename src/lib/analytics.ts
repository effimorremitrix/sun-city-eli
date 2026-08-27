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
  | "lead_submit"
  | "login"
  | "search"
  | "signup";

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
    siteId,
    listingId: listingId ?? null,
    path: window.location.pathname,
    sessionId: session.id,
  });
}
