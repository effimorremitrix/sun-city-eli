import { supabase } from "@/integrations/supabase/client";
import { fileExt, fileMimeType } from "@/lib/media";

/**
 * ליבת העלאת מדיה לאזור הניהול — ל-bucket הציבורי site-media.
 * מודול נפרד מ-media.ts (שמיובא גם מקומפוננטות ציבוריות): כאן יש תלות
 * בקליינט הדפדפן של Supabase, ולכן לייבא רק מקומפוננטות ניהול.
 */

const BUCKET = "site-media";

export const RASTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SVG_TYPE = "image/svg+xml";
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

/** מזהה אקראי לשם הקובץ; נופל לגיבוי בדפדפנים ישנים בלי crypto.randomUUID */
const randomId = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* נופלים לגיבוי למטה */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** תוקף הכתובת החתומה שמשמשת כגיבוי — עשר שנים, כדי שלא תפקע בפני המשתמש */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

/**
 * הודעה בעברית לשגיאת אחסון של Supabase, שמגיעה באנגלית ומוצגת בממשק עברי.
 * מכוונת לשתי התקלות שבאמת קורות בשטח: חוסר הרשאה (סוכן שאינו מנהל של הדף)
 * ו-bucket שאינו מוגדר כמצופה.
 */
export const storageErrorMessage = (raw: string): string => {
  const m = raw.toLowerCase();
  if (m.includes("row-level security") || m.includes("unauthorized") || m.includes("403")) {
    return "אין לך הרשאה להעלות קבצים לדף הזה. פנה למנהל המערכת.";
  }
  if (m.includes("bucket not found") || m.includes("nosuchbucket")) {
    return "אחסון המדיה של האתר אינו מוגדר. פנה למנהל המערכת.";
  }
  if (m.includes("mime type") || m.includes("invalid_mime_type")) {
    return "סוג הקובץ אינו נתמך באחסון של האתר.";
  }
  if (m.includes("exceeded the maximum allowed size") || m.includes("payload too large")) {
    return "הקובץ גדול מדי.";
  }
  return raw || "העלאת הקובץ נכשלה";
};

/**
 * כתובת קריאה יציבה לקובץ שהועלה. ברירת המחדל היא כתובת ציבורית קבועה, אבל אם
 * ה-bucket אינו ציבורי בפועל היא מחזירה NoSuchBucket והתמונה נשברת בלי שההעלאה
 * עצמה נכשלה — בדיוק התקלה שבגללה נשמרו בעבר כתובות חתומות ידנית. לכן מאמתים
 * את הכתובת, ורק אם היא באמת לא נגישה נופלים לכתובת חתומה ארוכת-טווח.
 */
async function readableUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  // מעקף מטמון: תשובת 400 של bucket פרטי עלולה להישמר ב-CDN
  const reachable = await fetch(`${publicUrl}?v=${Date.now()}`, { method: "HEAD" })
    .then((r) => r.ok)
    .catch(() => false);
  if (reachable) return publicUrl;

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  return signed?.signedUrl ?? publicUrl;
}

/** הודעת "סוגי קבצים נתמכים" לפי רשימת ה-MIME המותרת בשדה */
const supportedKindsMessage = (allowed: string[]): string => {
  const kinds = [
    allowed.some((m) => RASTER_TYPES.includes(m)) ? "JPG, PNG, WebP" : "",
    allowed.includes(SVG_TYPE) ? "SVG" : "",
    allowed.some((m) => VIDEO_TYPES.includes(m)) ? "MP4, WebM" : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `סוגי קבצים נתמכים: ${kinds}`;
};

/**
 * מוודא ומעלה קובץ ל-site-media ומחזיר כתובת קריאה יציבה — ציבורית כשאפשר,
 * וחתומה ארוכת-טווח כשה-bucket אינו ציבורי (ראו readableUrl).
 * זורק Error עם הודעה בעברית כשסוג הקובץ לא נתמך, הקובץ גדול מדי או
 * שההעלאה נכשלה.
 */
export async function uploadSiteMedia(
  file: File,
  folder: string,
  allowed: string[],
): Promise<string> {
  // סוג הקובץ מהדפדפן, ואם ריק (נפוץ ל-SVG בווינדוס) — נגזר מהסיומת
  const type = fileMimeType(file);
  if (!allowed.includes(type)) throw new Error(supportedKindsMessage(allowed));

  const isVideo = type.startsWith("video/");
  if (file.size > (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)) {
    throw new Error(isVideo ? "הסרטון גדול מדי (עד 50MB)" : "הקובץ גדול מדי (עד 5MB)");
  }

  const ext = fileExt(file.name) || "jpg";
  const path = `${folder}/${randomId()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    // contentType מפורש לפי הסוג שנגזר — כדי שהעלאת SVG עם file.type ריק לא תיפסל
    contentType: type,
    upsert: false,
  });
  if (error) throw new Error(storageErrorMessage(error.message));

  return readableUrl(path);
}
