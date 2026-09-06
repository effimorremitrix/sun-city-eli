/**
 * זיהוי סוג מדיה לפי כתובת — משמש את סליידר ההירו ואת שדות ההעלאה בניהול.
 * הבדיקה על ה-pathname בלבד: כתובות חתומות ישנות נושאות ?token=... אחרי הסיומת.
 */
export const isVideoUrl = (url: string): boolean => {
  let pathname: string;
  try {
    pathname = new URL(url, "http://x").pathname;
  } catch {
    pathname = url.split("?")[0] ?? url;
  }
  return /\.(mp4|webm|mov|m4v)$/i.test(pathname);
};

/** מקור אמת יחיד: סוג MIME → הסיומות המוכרות לו (משמש להעלאות בניהול) */
export const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/svg+xml": ["svg"],
  "video/mp4": ["mp4", "m4v"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
};

const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXTENSIONS).flatMap(([mime, exts]) => exts.map((ext) => [ext, mime])),
);

/** סיומת הקובץ באותיות קטנות ובלי הנקודה; מחרוזת ריקה כשאין סיומת */
export const fileExt = (name: string): string => name.split(".").pop()?.toLowerCase() ?? "";

/**
 * סוג ה-MIME של קובץ שנבחר להעלאה. חלק מהדפדפנים — בעיקר בווינדוס, ובמיוחד
 * עבור SVG — מחזירים file.type ריק כשהסיומת אינה רשומה במערכת ההפעלה. במקרה
 * כזה נופלים לגזירה מהסיומת, כדי שהקובץ לא ייפסל בטעות ותישלח contentType תקינה.
 */
export const fileMimeType = (file: File): string =>
  file.type || EXT_TO_MIME[fileExt(file.name)] || "";

/**
 * ערך accept ל-<input type="file">: גם סוגי MIME וגם סיומות מפורשות — כך שבורר
 * הקבצים של ווינדוס מציג את הקבצים גם כשהוא לא מזהה את ה-MIME לפי הסיומת.
 */
export const acceptFor = (mimes: string[]): string =>
  [...mimes, ...mimes.flatMap((m) => (MIME_EXTENSIONS[m] ?? []).map((ext) => `.${ext}`))].join(",");
