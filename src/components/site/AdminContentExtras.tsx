import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Video } from "lucide-react";
import { saveSiteContent } from "@/lib/site.functions";
import type { LiveFaqItem, LiveTestimonial } from "@/lib/site-live";
import { DICTS } from "@/lib/i18n";
import { acceptFor } from "@/lib/media";
import { RASTER_TYPES, VIDEO_TYPES, uploadSiteMedia } from "@/lib/upload-media";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

type MediaKind = NonNullable<LiveTestimonial["mediaKind"]>;

/** סוג המדיה של ממליץ — המלצות ישנות (בלי השדה) נגזרות מהקישור ששמור בהן */
const kindOf = (t: LiveTestimonial): MediaKind =>
  t.mediaKind ?? (t.videoUrl ? "video" : t.imageUrl ? "image" : "text");

/** התקדמות העלאה של ממליץ אחד: שלב (דחיסה/העלאה) ואחוזים */
type UploadProgress = { id: string; phase: "compressing" | "uploading"; percent: number };

/** עורך רשימות גנרי: הזזה למעלה/למטה ומחיקה */
function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item!);
  return copy;
}

/**
 * עריכת ממליצים (טקסט / תמונה / סרטון המלצה) ושאלות נפוצות — טאב "תוכן העסק".
 * כשאין תוכן שמור במסד, האתר מציג את התוכן הסטטי; אפשר לייבא אותו כבסיס לעריכה.
 * הטקסטים מתורגמים אוטומטית לשפות האתר בשמירה (ראו saveSiteContent).
 */
export function AdminContentExtras({
  siteId,
  testimonials,
  faq,
  onSaved,
}: {
  siteId: string;
  testimonials: LiveTestimonial[] | null;
  faq: LiveFaqItem[] | null;
  onSaved: () => void;
}) {
  const saveContent = useServerFn(saveSiteContent);
  const tHe = DICTS.he;

  const [items, setItems] = useState<LiveTestimonial[]>(testimonials ?? []);
  const [faqItems, setFaqItems] = useState<LiveFaqItem[]>(faq ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** הממליץ שקובץ שלו נמצא כרגע בהעלאה — משבית את שאר כפתורי ההעלאה */
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  /** ביטול העלאה/דחיסה כשהקומפוננטה יורדת מהמסך */
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const uploadingId = progress?.id ?? null;

  const patchItem = (id: string, patch: Partial<LiveTestimonial>) =>
    // עדכון פונקציונלי: ההעלאה אסינכרונית והרשימה עלולה להשתנות בינתיים
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /**
   * העלאת קובץ מדיה לתיקיית testimonials וכתיבת הכתובת לשדה המתאים.
   * סרטונים: דחיסה בדפדפן (כשגדולים) + העלאה מתחדשת עם מד התקדמות.
   */
  const handleUpload = async (
    id: string,
    kind: "image" | "video" | "poster",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // איפוס — בחירה חוזרת של אותו קובץ תפעיל שוב onChange
    if (!file) return;
    setErr(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ id, phase: "uploading", percent: 0 });
    try {
      const url = await uploadSiteMedia(
        file,
        "testimonials",
        kind === "video" ? VIDEO_TYPES : RASTER_TYPES,
        {
          signal: controller.signal,
          onCompressProgress: (percent) => setProgress({ id, phase: "compressing", percent }),
          onProgress: (percent) => setProgress({ id, phase: "uploading", percent }),
        },
      );
      if (kind === "video") patchItem(id, { videoUrl: url });
      else if (kind === "poster") patchItem(id, { posterUrl: url });
      else patchItem(id, { imageUrl: url });
    } catch (uploadErr) {
      if (!controller.signal.aborted) {
        setErr(uploadErr instanceof Error ? uploadErr.message : "העלאת הקובץ נכשלה");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setProgress(null);
    }
  };

  useEffect(() => {
    setItems(testimonials ?? []);
    setFaqItems(faq ?? []);
  }, [testimonials, faq]);

  const seedTestimonials = () =>
    setItems(
      tHe.testimonials.items.map((t) => ({
        id: newId(),
        name: t.name,
        type: t.type,
        quote: t.quote,
        mediaKind: "text",
        videoUrl: "",
        imageUrl: "",
        posterUrl: "",
      })),
    );

  const seedFaq = () => setFaqItems(tHe.faq.items.map((f) => ({ id: newId(), q: f.q, a: f.a })));

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await saveContent({
        data: {
          siteId,
          // רשימה ריקה = חזרה לתוכן הסטטי של האתר
          testimonials: items.length
            ? items.map((t) => ({
                ...t,
                mediaKind: kindOf(t),
                videoUrl: t.videoUrl ?? "",
                imageUrl: t.imageUrl ?? "",
                posterUrl: t.posterUrl ?? "",
              }))
            : null,
          faq: faqItems.length ? faqItems : null,
        },
      });
      setMsg("הממליצים והשאלות הנפוצות נשמרו — השינויים באתר מיידיים, והתרגומים נוצרו אוטומטית.");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const rowButtons = (onUp: () => void, onDown: () => void, onDelete: () => void) => (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        aria-label="הזזה למעלה"
        onClick={onUp}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="הזזה למטה"
        onClick={onDown}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="מחיקה"
        onClick={onDelete}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-destructive/40 text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );

  /** כפתור העלאה (label עוטף input — לחיצה טבעית שפותחת את בורר הקבצים) */
  const uploadButton = (
    id: string,
    kind: "image" | "video" | "poster",
    label: string,
    Icon: typeof Video,
  ) => (
    <label
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary ${
        uploadingId ? "cursor-default opacity-60" : "cursor-pointer"
      }`}
    >
      <Icon className="size-4 text-sun" aria-hidden="true" />
      {uploadingId === id ? "מעלה…" : label}
      <input
        type="file"
        accept={acceptFor(kind === "video" ? VIDEO_TYPES : RASTER_TYPES)}
        className="hidden"
        disabled={uploadingId !== null}
        onChange={(e) => void handleUpload(id, kind, e)}
      />
    </label>
  );

  /** מד התקדמות של ההעלאה/הדחיסה של ממליץ מסוים */
  const progressBar = (id: string) => {
    if (!progress || progress.id !== id) return null;
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
  };

  const KINDS: { value: MediaKind; label: string }[] = [
    { value: "text", label: tHe.testimonials.kindText },
    { value: "image", label: tHe.testimonials.kindImage },
    { value: "video", label: tHe.testimonials.kindVideo },
  ];

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="text-lg font-extrabold text-primary">ממליצים ושאלות נפוצות</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        התוכן כאן מחליף את הממליצים והשאלות הקבועים של האתר. רשימה ריקה = האתר חוזר לתוכן הקבוע. לכל
        ממליץ אפשר לצרף תמונה או סרטון המלצה — העלאת קובץ (MP4/WebM/MOV עד 500MB, סרטונים גדולים
        נדחסים אוטומטית), קישור YouTube או כתובת ישירה. העלאה ממלאת את שדה הקישור, והכול נשמר רק
        בלחיצה על שמירה. הטקסטים מתורגמים אוטומטית לאנגלית, צרפתית ורוסית בשמירה.
      </p>

      {msg && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>
      )}
      {err && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {/* ---------- ממליצים ---------- */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-primary">ממליצים (עדויות לקוחות)</h3>
        <div className="flex gap-2 text-sm">
          {items.length === 0 && (
            <button type="button" className="underline" onClick={seedTestimonials}>
              ייבוא הממליצים הקיימים באתר
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 font-bold text-primary"
            onClick={() =>
              setItems([
                ...items,
                {
                  id: newId(),
                  name: "",
                  type: "",
                  quote: "",
                  mediaKind: "text",
                  videoUrl: "",
                  imageUrl: "",
                  posterUrl: "",
                },
              ])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            הוספת ממליץ
          </button>
        </div>
      </div>

      <ul className="mt-3 grid gap-3">
        {items.map((t, i) => {
          const kind = kindOf(t);
          return (
            <li key={t.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      שם הממליץ
                    </span>
                    <input
                      className="field"
                      value={t.name}
                      maxLength={80}
                      onChange={(e) => patchItem(t.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      סוג העסקה (למשל: קניית דירה בנתניה)
                    </span>
                    <input
                      className="field"
                      value={t.type}
                      maxLength={60}
                      onChange={(e) => patchItem(t.id, { type: e.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      תוכן ההמלצה
                    </span>
                    <textarea
                      className="field min-h-20"
                      value={t.quote}
                      maxLength={600}
                      onChange={(e) => patchItem(t.id, { quote: e.target.value })}
                    />
                  </label>

                  {/* סוג המדיה: טקסט / תמונה / סרטון */}
                  <div className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      מדיה מצורפת להמלצה
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="סוג המדיה"
                      className="inline-flex rounded-xl border border-border p-0.5"
                    >
                      {KINDS.map((k) => (
                        <button
                          key={k.value}
                          type="button"
                          role="radio"
                          aria-checked={kind === k.value}
                          onClick={() => patchItem(t.id, { mediaKind: k.value })}
                          className={
                            kind === k.value
                              ? "rounded-lg bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground"
                              : "rounded-lg px-3 py-1.5 text-xs font-bold text-primary"
                          }
                        >
                          {k.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {kind === "image" && (
                    <div className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-muted-foreground">
                        תמונת ההמלצה — העלאת קובץ (JPG/PNG/WebP עד 5MB) או קישור
                      </span>
                      <div className="flex gap-2">
                        <input
                          className="field"
                          dir="ltr"
                          placeholder="https://..."
                          value={t.imageUrl ?? ""}
                          maxLength={2000}
                          onChange={(e) => patchItem(t.id, { imageUrl: e.target.value })}
                        />
                        {uploadButton(t.id, "image", "העלאת תמונה", ImagePlus)}
                      </div>
                      {progressBar(t.id)}
                      {t.imageUrl && (
                        <img
                          src={t.imageUrl}
                          alt=""
                          className="mt-2 max-h-40 rounded-lg border border-border object-cover"
                        />
                      )}
                    </div>
                  )}

                  {kind === "video" && (
                    <div className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-muted-foreground">
                        סרטון המלצה — העלאת קובץ או קישור (YouTube / כתובת ישירה)
                      </span>
                      <div className="flex gap-2">
                        <input
                          className="field"
                          dir="ltr"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={t.videoUrl ?? ""}
                          maxLength={2000}
                          onChange={(e) => patchItem(t.id, { videoUrl: e.target.value })}
                        />
                        {uploadButton(t.id, "video", "העלאת סרטון", Video)}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        עד 500MB, סרטונים גדולים נדחסים אוטומטית
                      </p>
                      {progressBar(t.id)}
                      <div className="mt-2 flex gap-2">
                        <input
                          className="field"
                          dir="ltr"
                          placeholder="תמונת פתיחה לסרטון (אופציונלי) — https://..."
                          value={t.posterUrl ?? ""}
                          maxLength={2000}
                          onChange={(e) => patchItem(t.id, { posterUrl: e.target.value })}
                        />
                        {uploadButton(t.id, "poster", "תמונת פתיחה", ImagePlus)}
                      </div>
                    </div>
                  )}
                </div>
                {rowButtons(
                  () => setItems(moveItem(items, i, -1)),
                  () => setItems(moveItem(items, i, 1)),
                  () => setItems(items.filter((x) => x.id !== t.id)),
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          אין ממליצים שמורים — האתר מציג את הממליצים הקבועים.
        </p>
      )}

      {/* ---------- שאלות נפוצות ---------- */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-primary">שאלות נפוצות</h3>
        <div className="flex gap-2 text-sm">
          {faqItems.length === 0 && (
            <button type="button" className="underline" onClick={seedFaq}>
              ייבוא השאלות הקיימות באתר
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 font-bold text-primary"
            onClick={() => setFaqItems([...faqItems, { id: newId(), q: "", a: "" }])}
          >
            <Plus className="size-4" aria-hidden="true" />
            הוספת שאלה
          </button>
        </div>
      </div>

      <ul className="mt-3 grid gap-3">
        {faqItems.map((f, i) => (
          <li key={f.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">שאלה</span>
                  <input
                    className="field"
                    value={f.q}
                    maxLength={200}
                    onChange={(e) =>
                      setFaqItems(
                        faqItems.map((x) => (x.id === f.id ? { ...x, q: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">תשובה</span>
                  <textarea
                    className="field min-h-20"
                    value={f.a}
                    maxLength={1000}
                    onChange={(e) =>
                      setFaqItems(
                        faqItems.map((x) => (x.id === f.id ? { ...x, a: e.target.value } : x)),
                      )
                    }
                  />
                </label>
              </div>
              {rowButtons(
                () => setFaqItems(moveItem(faqItems, i, -1)),
                () => setFaqItems(moveItem(faqItems, i, 1)),
                () => setFaqItems(faqItems.filter((x) => x.id !== f.id)),
              )}
            </div>
          </li>
        ))}
      </ul>
      {faqItems.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          אין שאלות שמורות — האתר מציג את השאלות הקבועות.
        </p>
      )}

      <button
        type="button"
        disabled={busy || uploadingId !== null}
        onClick={() => void save()}
        className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
      >
        {busy ? "שומר ומתרגם…" : "שמירת ממליצים ושאלות נפוצות"}
      </button>
    </section>
  );
}
