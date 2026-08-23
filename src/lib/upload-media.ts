import { supabase } from "@/integrations/supabase/client";
import { fileExt, fileMimeType } from "@/lib/media";

/**
 * ליבת העלאת מדיה לאזור הניהול — ל-bucket‏ site-media.
 * מודול נפרד מ-media.ts (שמיובא גם מקומפוננטות ציבוריות): כאן יש תלות
 * בקליינט הדפדפן של Supabase, ולכן לייבא רק מקומפוננטות ניהול.
 *
 * site-media הוא bucket *פרטי*, ולכן כל ההעלאות מחזירות כתובת חתומה ולא
 * כתובת ציבורית. אל תנסו להחליף את זה ב-getPublicUrl: מדיניות הסביבה של
 * Lovable Cloud חוסמת הפיכת bucket לציבורי, וכתובת ציבורית כאן מחזירה
 * NoSuchBucket. הרקע המלא ב-20260823120000_site_media_public.sql.
 * הקריאה פתוחה לכולם דרך המדיניות site_media_public_select על
 * storage.objects, כך שכתובת חתומה נטענת גם אצל גולש אנונימי.
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

/**
 * תוקף הכתובת החתומה — עשר שנים. ארוך בהרבה מה-TTL של listing-images
 * (שבוע, listing-images.server.ts) ובכוונה: שם הכתובת נחתמת מחדש בכל רינדור
 * בשרת, וכאן היא *נשמרת* ב-site_content.business ולכן חייבת לשרוד. זה גם
 * התוקף של ה-logoUrl של sun-city, שנחתם ידנית בזמנו מאותה סיבה.
 */
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
 * כתובת קריאה יציבה לקובץ שהועלה — חתומה, לפי מודל ה-bucket הפרטי שמתואר
 * בראש הקובץ. זורק כשהחתימה נכשלה, במקום להחזיר כתובת שלא תיטען: עדיף
 * שההעלאה תיכשל בגלוי מאשר שתישמר בשדה כתובת שבורה.
 */
async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw new Error(storageErrorMessage(error.message));
  if (!data?.signedUrl) throw new Error("יצירת כתובת לקובץ שהועלה נכשלה");
  return data.signedUrl;
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
 * מוודא ומעלה קובץ ל-site-media ומחזיר כתובת חתומה ארוכת-טווח.
 * זורק Error עם הודעה בעברית כשסוג הקובץ לא נתמך, הקובץ גדול מדי,
 * ההעלאה נכשלה או שלא ניתן היה לחתום על הכתובת.
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

  return signedUrl(path);
}
