import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { DICTS } from "@/lib/i18n";
import { acceptFor } from "@/lib/media";
import { RASTER_TYPES, VIDEO_TYPES, uploadSiteMedia } from "@/lib/upload-media";
import type { ManagedSite } from "@/lib/admin.server";

/**
 * ============================================================
 * ווידג'ט העלאת מדיה משותף לטאבי הניהול (ממליצים, מהשטח):
 * hook שמנהל התקדמות/ביטול, כפתור העלאה ומד התקדמות — הפורמט שהיה
 * בעורך הממליצים הישן (AdminContentExtras) הוצא לכאן לשימוש חוזר.
 * בנוסף: בורר "היקף הצגה" (כללי / דף אחד / כמה דפים) שמשותף לשני הטאבים.
 * ============================================================
 */

export type UploadKind = "image" | "video";

export type UploadProgress = {
  /** מזהה השדה שבהעלאה (למשל "video" / "poster") */
  key: string;
  phase: "compressing" | "uploading";
  percent: number;
};

/** ניהול העלאה אחת בכל רגע: התקדמות, שגיאה וביטול כשהקומפוננטה יורדת */
export function useMediaUpload(folder: string) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const upload = async (key: string, kind: UploadKind, file: File): Promise<string | null> => {
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ key, phase: "uploading", percent: 0 });
    try {
      return await uploadSiteMedia(file, folder, kind === "video" ? VIDEO_TYPES : RASTER_TYPES, {
        signal: controller.signal,
        onCompressProgress: (percent) => setProgress({ key, phase: "compressing", percent }),
        onProgress: (percent) => setProgress({ key, phase: "uploading", percent }),
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "העלאת הקובץ נכשלה");
      }
      return null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setProgress(null);
    }
  };

  return { progress, error, setError, upload, uploadingKey: progress?.key ?? null };
}

/** כפתור העלאה (label עוטף input — לחיצה טבעית שפותחת את בורר הקבצים) */
export function MediaUploadButton({
  uploadKey,
  kind,
  label,
  icon: Icon,
  uploadingKey,
  onFile,
}: {
  uploadKey: string;
  kind: UploadKind;
  label: string;
  icon: LucideIcon;
  uploadingKey: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary ${
        uploadingKey ? "cursor-default opacity-60" : "cursor-pointer"
      }`}
    >
      <Icon className="size-4 text-sun" aria-hidden="true" />
      {uploadingKey === uploadKey ? "מעלה…" : label}
      <input
        type="file"
        accept={acceptFor(kind === "video" ? VIDEO_TYPES : RASTER_TYPES)}
        className="hidden"
        disabled={uploadingKey !== null}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // איפוס — בחירה חוזרת של אותו קובץ תפעיל שוב onChange
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** מד התקדמות של ההעלאה/הדחיסה של שדה מסוים */
export function UploadProgressBar({
  progress,
  uploadKey,
}: {
  progress: UploadProgress | null;
  uploadKey: string;
}) {
  if (!progress || progress.key !== uploadKey) return null;
  const tHe = DICTS.he;
  const label =
    progress.phase === "compressing"
      ? `${tHe.media.compressing} ${progress.percent}%`
      : tHe.media.uploading(progress.percent);
  return (
    <div className="mt-2" aria-live="polite">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-sun transition-[width] duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ------------------------- היקף הצגה ------------------------- */

export type ScopeMode = "global" | "single" | "multi";

export type ScopeValue = {
  mode: ScopeMode;
  /** הדף שנבחר במצב "דף אחד" */
  singleSiteId: string;
  /** הדפים שנבחרו במצב "כמה דפים" */
  siteIds: string[];
};

/** גזירת מצב הבורר מרשומה שמורה (scope + site_ids) */
export const scopeFromRow = (
  scope: "global" | "sites",
  siteIds: string[],
  fallbackSiteId: string | null,
): ScopeValue => {
  if (scope === "global") return { mode: "global", singleSiteId: fallbackSiteId ?? "", siteIds: [] };
  if (siteIds.length <= 1) {
    return { mode: "single", singleSiteId: siteIds[0] ?? fallbackSiteId ?? "", siteIds: [] };
  }
  return { mode: "multi", singleSiteId: siteIds[0] ?? "", siteIds };
};

/** מה נשלח לשרת: scope + siteIds. סוכן — תמיד הדף שלו (השרת אוכף זאת ממילא) */
export const scopeToPayload = (
  value: ScopeValue,
  isAdmin: boolean,
  ownSiteId: string | null,
): { scope: "global" | "sites"; siteIds: string[] } => {
  if (!isAdmin) return { scope: "sites", siteIds: ownSiteId ? [ownSiteId] : [] };
  if (value.mode === "global") return { scope: "global", siteIds: [] };
  if (value.mode === "single") {
    return { scope: "sites", siteIds: value.singleSiteId ? [value.singleSiteId] : [] };
  }
  return { scope: "sites", siteIds: value.siteIds };
};

/** תווית היקף לכרטיס ברשימה */
export const scopeLabel = (
  scope: "global" | "sites",
  siteIds: string[],
  sites: ManagedSite[],
): string => {
  if (scope === "global") return "כללי — כל הדפים";
  const names = siteIds.map((id) => sites.find((s) => s.id === id)?.name ?? "דף");
  return `דפים: ${names.join(", ") || "—"}`;
};

/**
 * בורר היקף הצגה. לאדמין — שלוש אפשרויות (כללי / סוכן מסוים / כמה סוכנים);
 * לסוכן — הודעה קבועה "תופיע בדף שלך".
 */
export function ScopePicker({
  value,
  onChange,
  sites,
  isAdmin,
  labels,
}: {
  value: ScopeValue;
  onChange: (next: ScopeValue) => void;
  sites: ManagedSite[];
  isAdmin: boolean;
  labels: { global: string; single: string; multi: string };
}) {
  if (!isAdmin) {
    return (
      <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs font-bold text-primary">
        תופיע בדף שלך
      </p>
    );
  }
  const options: Array<[ScopeMode, string]> = [
    ["global", labels.global],
    ["single", labels.single],
    ["multi", labels.multi],
  ];
  return (
    <div role="radiogroup" aria-label="היקף הצגה" className="grid gap-2">
      {options.map(([mode, label]) => (
        <label
          key={mode}
          className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
            value.mode === mode ? "border-sun bg-sun/10" : "border-border"
          }`}
        >
          <input
            type="radio"
            name="scope-mode"
            className="mt-1 accent-sun"
            checked={value.mode === mode}
            onChange={() => onChange({ ...value, mode })}
          />
          <span className="font-bold text-primary">{label}</span>
        </label>
      ))}

      {value.mode === "single" && (
        <select
          className="field"
          aria-label="בחירת דף"
          value={value.singleSiteId}
          onChange={(e) => onChange({ ...value, singleSiteId: e.target.value })}
        >
          <option value="">— בחירת דף —</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} /{s.slug}
            </option>
          ))}
        </select>
      )}

      {value.mode === "multi" && (
        <ul className="grid gap-1 rounded-xl border border-border p-2 sm:grid-cols-2">
          {sites.map((s) => {
            const checked = value.siteIds.includes(s.id);
            return (
              <li key={s.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-sun"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...value,
                        siteIds: checked
                          ? value.siteIds.filter((id) => id !== s.id)
                          : [...value.siteIds, s.id],
                      })
                    }
                  />
                  <span className="font-semibold text-primary">{s.name}</span>
                  <span className="text-xs text-muted-foreground">/{s.slug}</span>
                </label>
              </li>
            );
          })}
          {sites.length === 0 && (
            <li className="text-xs text-muted-foreground">אין דפים פעילים לבחירה</li>
          )}
        </ul>
      )}
    </div>
  );
}
