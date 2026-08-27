/**
 * "חזרה לאתר" מדפים שחיים מחוץ לעץ הדפים הציבוריים (אזור אישי, התחברות,
 * עמודים משפטיים): הדף הציבורי האחרון שביקרו בו — כולל ה-slug של הסוכן
 * והשפה — נשמר בדפדפן, כך שהקישור מחזיר את הגולש לדף של אותו סוכן ולא
 * לאתר הראשי של המשרד.
 */
import { useEffect, useState } from "react";

const KEY = "suncity:last-site-path";

/** נקרא מהדפים הציבוריים — שומר את הנתיב הנוכחי (למשל "/en/inbal") */
export function rememberSitePath(path: string) {
  try {
    if (path.startsWith("/")) localStorage.setItem(KEY, path);
  } catch {
    // אחסון חסום (מצב פרטי וכו') — פשוט לא זוכרים
  }
}

/** היעד של "חזרה לאתר" — הדף הציבורי האחרון, או "/" כשאין כזה */
export function getBackToSiteHref(): string {
  try {
    return localStorage.getItem(KEY) || "/";
  } catch {
    return "/";
  }
}

/** גרסת hook — מחזירה "/" ברינדור השרת ומתעדכנת אחרי ההידרציה (בלי אזהרות) */
export function useBackToSiteHref(): string {
  const [href, setHref] = useState("/");
  useEffect(() => {
    setHref(getBackToSiteHref());
  }, []);
  return href;
}
