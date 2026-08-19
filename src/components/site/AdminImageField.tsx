import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acceptFor, fileExt, fileMimeType, isVideoUrl } from "@/lib/media";

const BUCKET = "site-media";
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const RASTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SVG_TYPE = "image/svg+xml";
const VIDEO_TYPES = ["video/mp4", "video/webm"];

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

type Props = {
  label: string;
  /** הכתובת השמורה — ריק כשלא נבחרה תמונה */
  value: string;
  onChange: (url: string) => void;
  /** תיקיית היעד ב-bucket, למשל "logos" או "agents" */
  folder: string;
  /** לוגו מותר גם כ-SVG; תצלום סוכן לא */
  allowSvg?: boolean;
  /** סליידר ההירו מקבל גם סרטונים (mp4/webm, עד 50MB) */
  allowVideo?: boolean;
  hint?: string;
};

/**
 * שדה תמונה (או סרטון) יחיד לאזור הניהול: תצוגה מקדימה, העלאת קובץ ל-bucket
 * הציבורי site-media, הסרה, ואפשרות להדביק כתובת חיצונית (לערכים שנשמרו כך בעבר).
 */
export default function AdminImageField({
  label,
  value,
  onChange,
  folder,
  allowSvg = false,
  allowVideo = false,
  hint,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowed = [
    ...RASTER_TYPES,
    ...(allowSvg ? [SVG_TYPE] : []),
    ...(allowVideo ? VIDEO_TYPES : []),
  ];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);

    // סוג הקובץ מהדפדפן, ואם ריק (נפוץ ל-SVG בווינדוס) — נגזר מהסיומת
    const type = fileMimeType(file);
    if (!allowed.includes(type)) {
      const kinds = ["JPG, PNG, WebP", allowSvg ? "SVG" : "", allowVideo ? "MP4, WebM" : ""]
        .filter(Boolean)
        .join(", ");
      setErr(`סוגי קבצים נתמכים: ${kinds}`);
      return;
    }
    const isVideo = type.startsWith("video/");
    if (file.size > (isVideo ? MAX_VIDEO_SIZE : MAX_SIZE)) {
      setErr(isVideo ? "הסרטון גדול מדי (עד 50MB)" : "הקובץ גדול מדי (עד 5MB)");
      return;
    }

    setBusy(true);
    try {
      const ext = fileExt(file.name) || "jpg";
      const path = `${folder}/${randomId()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        // contentType מפורש לפי הסוג שנגזר — כדי שהעלאת SVG עם file.type ריק לא תיפסל
        contentType: type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      // ה-bucket ציבורי — נשמרת כתובת קבועה שאינה פוקעת (כתובות חתומות ישנות
      // ממשיכות לעבוד עד לפקיעתן)
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "העלאת הקובץ נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>

      <div className="flex items-start gap-3">
        {value ? (
          isVideoUrl(value) ? (
            <video
              src={value}
              muted
              playsInline
              preload="metadata"
              className="size-16 shrink-0 rounded-lg border border-border bg-card object-contain"
            />
          ) : (
            <img
              src={value}
              alt=""
              className="size-16 shrink-0 rounded-lg border border-border bg-card object-contain"
            />
          )
        ) : (
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
            aria-hidden="true"
          >
            <ImagePlus className="size-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <input
            className="field"
            dir="ltr"
            placeholder="https://…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* לחצן ההעלאה עוטף את שדה הקובץ ב-<label> — לחיצה טבעית שפותחת את
                בורר הקבצים בכל דפדפן, בלי קריאה תכנותית ל-click() שנחסמת לעיתים. */}
            <label
              className={`inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary ${
                busy ? "cursor-default opacity-60" : "cursor-pointer"
              }`}
            >
              <ImagePlus className="size-4 text-sun" aria-hidden="true" />
              {busy ? "מעלה…" : "העלאת קובץ"}
              <input
                ref={inputRef}
                type="file"
                accept={acceptFor(allowed)}
                className="hidden"
                disabled={busy}
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </label>
            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive underline disabled:opacity-60"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                הסרה
              </button>
            )}
          </div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {err && (
            <p role="alert" className="mt-1 text-xs font-semibold text-destructive">
              {err}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
