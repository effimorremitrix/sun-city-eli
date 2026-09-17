/**
 * ============================================================
 * פתיחת וואטסאפ מהדפדפן — מקור אמת יחיד לכל כפתורי "דברו איתנו" /
 * "סוכן יחזור אליי" באתר.
 *
 * למה מודול נפרד מ-site-data.ts: שם openWa עשה window.open("https://wa.me/…")
 * בלבד. זה עובד בנייד (המערכת מעבירה את הקישור לאפליקציה), אבל במחשב הוא
 * נכשל בשני מצבים שקרו בשטח:
 *   1. הפתיחה קורית *אחרי* await (שמירת הליד) — הדפדפן כבר לא רואה אותה
 *      כחלק מהקלקה, וחוסם את החלון הקופץ. בנייד החסימה סלחנית יותר.
 *   2. wa.me במחשב מנתב לעמוד ביניים שמבקש להוריד אפליקציה, ומשתמש בלי
 *      אפליקציית דסקטופ נתקע שם במקום להגיע ל-WhatsApp Web.
 *
 * הפתרון: לפתוח לשונית ריקה *מיד* בתוך ההקלקה, לנווט אותה אחרי ה-await,
 * ולבחור יעד לפי המכשיר — נייד: wa.me (מעביר לאפליקציה), מחשב:
 * web.whatsapp.com/send (נפתח ב-WhatsApp Web, ומי שמותקנת אצלו האפליקציה
 * מקבל ממנה הצעת מעבר). בכל מצב מוחזרת הכתובת, כדי שה-UI יוכל להציג
 * קישור גיבוי גלוי כשהחלון נחסם.
 * ============================================================
 */

/** מספר הוואטסאפ של המשרד — ברירת המחדל כשלדף אין מספר סוכן */
export const WA_PHONE = "0525551200";

/**
 * נרמול מספר לפורמט בינלאומי לכתובות wa.me / web.whatsapp.com.
 *
 * הגרסה הקודמת הוסיפה "972" תמיד, ולכן מספר שהוזן בלוח הניהול כבר בפורמט
 * בינלאומי ("972525551200" או "+972-52-555-1200") הפך ל-972972… והקישור
 * הוביל למספר לא קיים. הכלל כאן זהה ל-toE164Il בצד השרת: מספר שכבר מתחיל
 * ב-972 נשאר, מספר מקומי מאבד את ה-0 המוביל, ואחר מקבל קידומת.
 */
export const toIntl = (raw: string): string => {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return `972${digits}`;
};

/** קישור wa.me — נשמר לשימושים שדורשים כתובת ניתנת להעתקה (מיילים, קישורים) */
export const buildWa = (msg: string, phone: string = WA_PHONE) =>
  "https://wa.me/" + toIntl(phone) + "?text=" + encodeURIComponent(msg);

/** האם המכשיר נייד — לפי User-Agent, עם נפילה בטוחה ל"מחשב" ב-SSR */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(ua);
}

/** הכתובת המתאימה למכשיר הנוכחי */
export function whatsappUrl(msg: string, phone: string = WA_PHONE): string {
  const to = toIntl(phone);
  const text = encodeURIComponent(msg);
  return isMobileDevice()
    ? `https://wa.me/${to}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${to}&text=${text}`;
}

/** לשונית ריקה שנפתחת בתוך ההקלקה ומנווטת אחר כך */
export type PendingWaWindow = {
  /** מנווט את הלשונית ליעד; מחזיר false כשהחלון נחסם ולא נפתח כלום */
  go: (msg: string, phone?: string) => boolean;
  /** סוגר את הלשונית הריקה (כשהפעולה בוטלה) */
  cancel: () => void;
};

/**
 * נפתחת מיד בתוך מטפל ההקלקה, לפני כל await. מחזירה אובייקט שמנווט
 * את אותה לשונית כשהעבודה בשרת הסתיימה.
 */
export function reserveWhatsAppWindow(): PendingWaWindow {
  let win: Window | null = null;
  try {
    win = window.open("", "_blank", "noopener,noreferrer");
  } catch {
    win = null;
  }
  return {
    go: (msg, phone) => {
      const url = whatsappUrl(msg, phone);
      if (win && !win.closed) {
        try {
          win.location.href = url;
          win.focus();
          return true;
        } catch {
          /* נופלים לפתיחה רגילה */
        }
      }
      // הלשונית נחסמה או נסגרה — ניסיון אחרון בפתיחה רגילה
      try {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        return Boolean(opened);
      } catch {
        return false;
      }
    },
    cancel: () => {
      try {
        if (win && !win.closed) win.close();
      } catch {
        /* לא קריטי */
      }
    },
  };
}

/**
 * פתיחה ישירה (בלי await לפניה) — למשל קישורי וואטסאפ סטטיים בדף.
 * מחזירה את הכתובת כדי שהקורא יוכל להציג קישור גיבוי אם נחסם.
 */
export function openWhatsApp(msg: string, phone?: string): { url: string; opened: boolean } {
  const url = whatsappUrl(msg, phone);
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    return { url, opened: Boolean(win) };
  } catch {
    return { url, opened: false };
  }
}
