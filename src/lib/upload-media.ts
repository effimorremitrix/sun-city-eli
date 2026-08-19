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
 * מוודא ומעלה קובץ ל-site-media ומחזיר כתובת ציבורית קבועה שאינה פוקעת.
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
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
