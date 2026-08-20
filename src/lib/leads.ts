export const isValidIsraeliPhone = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^0(5\d|[23489]|7\d)\d{7}$/.test(digits)) return true; // 0501234567 / 037654321 / 0731234567
  if (/^972(5\d|[23489]|7\d)\d{7}$/.test(digits)) return true;
  return false;
};

export const phoneError = "נא להזין מספר טלפון ישראלי תקין (לדוגמה 050-1234567)";

/** נרמול לדדופ: ספרות בלבד בפורמט 972... (ריק אם אין מה לנרמל) */
export const normalizePhone = (raw: string | null | undefined): string => {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
};

// ---- מודול הלידים: סטטוסים, מקורות ואירועי ציר זמן ----
// text בבסיס הנתונים; הרשימות כאן הן מקור האמת לוולידציה בשרת ולתצוגה ב-UI.

export const LEAD_STATUSES = [
  "ליד חדש",
  "נוצר קשר",
  "מחפש פעיל",
  "נקבע סיור",
  "בוצע סיור",
  'מו"מ',
  "לא בשל כרגע",
  "נסגרה עסקה",
  "לא רלוונטי",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** סטטוסים סגורים — ליד כזה לא נספר בפתוחים ולא חוסם יצירת ליד חדש לאותו טלפון */
export const CLOSED_LEAD_STATUSES: readonly LeadStatus[] = ["נסגרה עסקה", "לא רלוונטי"];

export const LEAD_SOURCES = [
  "אתר אישי",
  "טופס יצירת קשר",
  "טופס מוכרים",
  "טופס קונים",
  "התעניינות בנכס",
  "הסוכן האישי",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "קמפיין",
  "ידני",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_EVENT_TYPES = [
  "created",
  "contact_again",
  "status_change",
  "call",
  "whatsapp",
  "property_sent",
  "tour_scheduled",
  "tour_done",
  "follow_up_set",
  "follow_up_done",
  "match",
  "client_response",
  "note",
] as const;
export type LeadEventType = (typeof LEAD_EVENT_TYPES)[number];

/** תגובות אפשריות של לקוח על התראת נכס, עם הטקסט שמוצג בציר הזמן */
export const CLIENT_RESPONSES = {
  interested: "מעניין אותי",
  wants_tour: "רוצה לראות את הנכס",
  talk_to_me: "דברו איתי",
} as const;
export type ClientResponse = keyof typeof CLIENT_RESPONSES;
