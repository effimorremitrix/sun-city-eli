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
  return /\.(mp4|webm)$/i.test(pathname);
};
