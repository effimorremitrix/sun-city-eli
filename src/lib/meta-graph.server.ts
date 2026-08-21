/**
 * גרסת Graph API משותפת לכל אינטגרציות מטא — פייסבוק, אינסטגרם ווואטסאפ.
 * מקור אמת יחיד: בומפ עתידי הוא שינוי שורה אחת כאן, ולא חיפוש מחרוזות בקוד.
 *
 * ניתן לעקוף ב-META_GRAPH_VERSION (למשל "v26.0" לגרסה חדשה, או "v21.0"
 * לחזרה אחורה בלי דיפלוי) — המשתנה נקרא בזמן הקריאה ולא בזמן טעינת המודול,
 * כי בסביבת Cloudflare/nitro משתני הסביבה לא בהכרח קיימים כבר ב-import.
 */

export const DEFAULT_GRAPH_VERSION = "v25.0";

export function graphVersion(): string {
  const v = process.env["META_GRAPH_VERSION"];
  return v && v.trim() ? v.trim() : DEFAULT_GRAPH_VERSION;
}

export function graphBase(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}
