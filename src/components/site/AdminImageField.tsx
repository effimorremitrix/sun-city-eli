import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "site-media";
const MAX_SIZE = 5 * 1024 * 1024;
const RASTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SVG_TYPE = "image/svg+xml";

type Props = {
  label: string;
  /** הכתובת השמורה — ריק כשלא נבחרה תמונה */
  value: string;
  onChange: (url: string) => void;
  /** תיקיית היעד ב-bucket, למשל "logos" או "agents" */
  folder: string;
  /** לוגו מותר גם כ-SVG; תצלום סוכן לא */
  allowSvg?: boolean;
  hint?: string;
};

/**
 * שדה תמונה יחיד לאזור הניהול: תצוגה מקדימה, העלאת קובץ ל-bucket הציבורי
 * site-media, הסרה, ואפשרות להדביק כתובת חיצונית (לערכים שנשמרו כך בעבר).
 */
export default function AdminImageField({
  label,
  value,
  onChange,
  folder,
  allowSvg = false,
  hint,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowed = allowSvg ? [...RASTER_TYPES, SVG_TYPE] : RASTER_TYPES;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);

    if (!allowed.includes(file.type)) {
      setErr(
        allowSvg ? "סוגי קבצים נתמכים: JPG, PNG, WebP, SVG" : "סוגי קבצים נתמכים: JPG, PNG, WebP",
      );
      return;
    }
    if (file.size > MAX_SIZE) {
      setErr("הקובץ גדול מדי (עד 5MB)");
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      // ה-bucket פרטי, ולכן נשמרת כתובת חתומה לטווח ארוך (10 שנים) שנטענת גם לגולש אנונימי
      const { data, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "יצירת קישור נכשלה");
      onChange(new URL(data.signedUrl, window.location.origin).toString());
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
          <img
            src={value}
            alt=""
            className="size-16 shrink-0 rounded-lg border border-border bg-card object-contain"
          />
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
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-60"
            >
              <ImagePlus className="size-4 text-sun" aria-hidden="true" />
              {busy ? "מעלה…" : "העלאת קובץ"}
            </button>
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

      <input
        ref={inputRef}
        type="file"
        accept={allowed.join(",")}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
