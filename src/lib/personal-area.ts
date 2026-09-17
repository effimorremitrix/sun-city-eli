/**
 * ============================================================
 * "האזור האישי שלי" — יעד אחד שנגזר מתפקיד המשתמש.
 *
 * הזרימה שהוגדרה: אחרי התחברות המשתמש חוזר קודם *לאתר* SUN CITY במצב
 * מחובר, ורק משם נכנס לאזור האישי. הכפתור בהדר צריך להוביל כל אחד למקום
 * הנכון לו — לקוח לפורטל, סוכן לניהול הדף שלו, ומנהל ללוח הניהול — בלי
 * לשנות שום הרשאה: הניתוב כאן הוא נוחות, והאכיפה נשארת ב-RLS ובבדיקות
 * assertManager/assertSuperAdmin בצד השרת.
 * ============================================================
 */

export type PersonalAreaRole = "client" | "agent" | "admin";

export type PersonalAreaUser = {
  isAdmin?: boolean;
  isAgent?: boolean;
} | null;

/** התפקיד לצורכי ניתוב בלבד — לא מקור אמת להרשאות */
export const personalAreaRole = (user: PersonalAreaUser): PersonalAreaRole => {
  if (user?.isAdmin) return "admin";
  if (user?.isAgent) return "agent";
  return "client";
};

/**
 * הטאב שאליו נכנסים באזור האישי:
 * לקוח — "החשבון שלי" (הפורטל והסוכן החכם); סוכן — הלידים שלו, המסך שהוא
 * עובד ממנו; מנהל — גם כן הלידים, ומשם כל שאר לוח הניהול פתוח לפניו.
 */
export const personalAreaTab = (role: PersonalAreaRole): "overview" | "leads" =>
  role === "client" ? "overview" : "leads";

/**
 * ה-props של הקישור לאזור האישי. מוחזר כ-to+search (ולא כמחרוזת עם "?")
 * כי הראוטר מצפה לנתיב ולפרמטרים בנפרד.
 */
export const personalAreaLink = (user: PersonalAreaUser) => {
  const tab = personalAreaTab(personalAreaRole(user));
  return { to: "/account" as const, search: tab === "overview" ? {} : { tab } };
};

/** הכתובת כמחרוזת — לשימושים שאינם Link של הראוטר (למשל window.location) */
export const personalAreaHref = (user: PersonalAreaUser): string => {
  const tab = personalAreaTab(personalAreaRole(user));
  return tab === "overview" ? "/account" : `/account?tab=${tab}`;
};
