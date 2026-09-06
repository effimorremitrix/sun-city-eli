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
 *
 * סרטונים עולים בפרוטוקול TUS (העלאה מתחדשת בחלקים) — קובץ של מאות MB
 * לא נופל על ניתוק רגעי, ומתקבל דיווח התקדמות. קבצים גדולים נדחסים קודם
 * בדפדפן (video-compress.ts) כשהוא תומך בכך.
 */

const BUCKET = "site-media";

export const RASTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SVG_TYPE = "image/svg+xml";
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
/** תקרת ה-bucket (20260906100600_translations_and_media.sql) — מעבר לזה האחסון דוחה */
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
/** מעל הגודל הזה מנסים לדחוס בדפדפן לפני ההעלאה */
export const COMPRESS_VIDEO_ABOVE = 45 * 1024 * 1024;
/** גודל חלק ב-TUS — Supabase דורש כפולות של 6MB */
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export type UploadOptions = {
  /** התקדמות 0–100 של ההעלאה עצמה (אחרי הדחיסה, אם הייתה) */
  onProgress?: (percent: number) => void;
  /** התקדמות 0–100 של הדחיסה בדפדפן (מדווח רק כשיש דחיסה) */
  onCompressProgress?: (percent: number) => void;
  /** ביטול: עוצר דחיסה או העלאה באמצע */
  signal?: AbortSignal;
};

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

/** הודעת "גדול מדי" למשתמש — מסבירה גם את תקרת הפלטפורמה */
const TOO_LARGE_MESSAGE =
  "הקובץ גדול מהמותר באחסון האתר (עד 500MB לסרטון). נסו לקצר את הסרטון או לייצא אותו באיכות נמוכה יותר.";

/**
 * הודעה בעברית לשגיאת אחסון של Supabase, שמגיעה באנגלית ומוצגת בממשק עברי.
 * מכוונת לתקלות שבאמת קורות בשטח: חוסר הרשאה (סוכן שאינו מנהל של הדף),
 * bucket שאינו מוגדר כמצופה, סוג קובץ לא מותר וקובץ שחורג מתקרת ה-bucket.
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
  if (
    m.includes("exceeded the maximum allowed size") ||
    m.includes("payload too large") ||
    m.includes("entity too large") ||
    m.includes("413")
  ) {
    return TOO_LARGE_MESSAGE;
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
    allowed.some((m) => VIDEO_TYPES.includes(m)) ? "MP4, WebM, MOV" : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `סוגי קבצים נתמכים: ${kinds}`;
};

/**
 * העלאה מתחדשת (TUS) של סרטון ל-site-media. הטוקן של המשתמש המחובר עובר
 * בכותרת authorization — המדיניות על storage.objects היא שמכריעה על ההרשאה,
 * בדיוק כמו ב-storage.upload הרגיל.
 */
async function uploadVideoResumable(
  blob: Blob,
  path: string,
  contentType: string,
  opts: UploadOptions,
): Promise<void> {
  const { Upload } = await import("tus-js-client");
  const baseUrl = String(import.meta.env["VITE_SUPABASE_URL"] ?? "").replace(/\/$/, "");
  const apiKey = String(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "");
  if (!baseUrl || !apiKey) throw new Error("אחסון המדיה של האתר אינו מוגדר. פנה למנהל המערכת.");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("יש להתחבר מחדש כדי להעלות קבצים.");

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(blob, {
      endpoint: `${baseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: apiKey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType,
        cacheControl: "3600",
      },
      chunkSize: TUS_CHUNK_SIZE,
      onError: (error) => {
        const res = (error as { originalResponse?: { getStatus?: () => number; getBody?: () => string } })
          .originalResponse;
        const status = res?.getStatus?.();
        const body = res?.getBody?.() ?? "";
        reject(new Error(storageErrorMessage(`${status ?? ""} ${body || error.message}`.trim())));
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (bytesTotal > 0) opts.onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: () => resolve(),
    });

    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(new Error("ההעלאה בוטלה"));
        return;
      }
      opts.signal.addEventListener(
        "abort",
        () => {
          void upload.abort(true).catch(() => undefined);
          reject(new Error("ההעלאה בוטלה"));
        },
        { once: true },
      );
    }

    // בלי resumeFromPreviousUpload: כל העלאה מקבלת נתיב אקראי חדש, וחידוש
    // העלאה ישנה היה משלים אובייקט בנתיב אחר מזה שאנחנו חותמים עליו
    upload.start();
  });
}

/**
 * מוודא ומעלה קובץ ל-site-media ומחזיר כתובת חתומה ארוכת-טווח.
 * זורק Error עם הודעה בעברית כשסוג הקובץ לא נתמך, הקובץ גדול מדי,
 * ההעלאה נכשלה או שלא ניתן היה לחתום על הכתובת.
 *
 * תמונות עולות בהעלאה רגילה; סרטונים ב-TUS, ואם הם גדולים (מעל 45MB)
 * נדחסים קודם בדפדפן — כשהוא תומך בכך והתוצאה קטנה יותר.
 */
export async function uploadSiteMedia(
  file: File,
  folder: string,
  allowed: string[],
  opts: UploadOptions = {},
): Promise<string> {
  // סוג הקובץ מהדפדפן, ואם ריק (נפוץ ל-SVG בווינדוס) — נגזר מהסיומת
  let type = fileMimeType(file);
  if (!allowed.includes(type)) throw new Error(supportedKindsMessage(allowed));

  const isVideo = type.startsWith("video/");
  if (file.size > (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)) {
    throw new Error(isVideo ? TOO_LARGE_MESSAGE : "הקובץ גדול מדי (עד 5MB)");
  }

  let ext = fileExt(file.name) || (isVideo ? "mp4" : "jpg");
  let blob: Blob = file;

  if (isVideo && file.size > COMPRESS_VIDEO_ABOVE) {
    const { canCompressVideo, compressVideo, compressedExt } = await import("@/lib/video-compress");
    if (canCompressVideo()) {
      try {
        const compressed = await compressVideo(file, {
          maxHeight: 720,
          videoBitsPerSecond: 2_500_000,
          onProgress: opts.onCompressProgress,
          signal: opts.signal,
        });
        if (compressed !== file && compressed.size < file.size) {
          blob = compressed;
          type = compressed.type || "video/webm";
          ext = compressedExt(type);
        }
      } catch (e) {
        if (opts.signal?.aborted) throw e;
        // דחיסה שנכשלה אינה מונעת העלאה — ה-bucket מקבל עד 500MB
        console.warn("video compression failed, uploading original", e);
      }
    }
  }

  const path = `${folder}/${randomId()}.${ext}`;

  if (isVideo) {
    await uploadVideoResumable(blob, path, type, opts);
  } else {
    if (opts.signal?.aborted) throw new Error("ההעלאה בוטלה");
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      // contentType מפורש לפי הסוג שנגזר — כדי שהעלאת SVG עם file.type ריק לא תיפסל
      contentType: type,
      upsert: false,
    });
    if (error) throw new Error(storageErrorMessage(error.message));
    opts.onProgress?.(100);
  }

  return signedUrl(path);
}
