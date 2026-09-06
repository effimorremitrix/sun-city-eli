import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, MessageSquareQuote, Pencil, Plus, Trash2, Video } from "lucide-react";
import {
  adminDeleteTestimonial,
  adminListTestimonials,
  adminSaveTestimonial,
  type TestimonialRow,
} from "@/lib/testimonials.functions";
import type { ManagedSite } from "@/lib/admin.server";
import {
  MediaUploadButton,
  ScopePicker,
  UploadProgressBar,
  scopeFromRow,
  scopeLabel,
  scopeToPayload,
  useMediaUpload,
  type ScopeValue,
} from "@/components/site/AdminMediaUpload";

/**
 * ============================================================
 * טאב "ממליצים" — טבלת testimonials. כל המלצה היא רשומה עצמאית עם היקף
 * הצגה: כללית (כל הדפים), של סוכן מסוים, או של כמה סוכנים. סוכן שאינו
 * אדמין רואה ועורך רק את שלו, וההמלצות שלו מוצגות תמיד בדף שלו.
 * ============================================================
 */

type MediaKind = TestimonialRow["media_kind"];

type Form = {
  id?: string;
  name: string;
  type: string;
  quote: string;
  mediaKind: MediaKind;
  imageUrl: string;
  videoUrl: string;
  posterUrl: string;
  scope: ScopeValue;
  isPublished: boolean;
  sortOrder: string;
};

const KINDS: Array<[MediaKind, string]> = [
  ["text", "טקסט"],
  ["image", "תמונה"],
  ["video", "סרטון"],
];

const SCOPE_LABELS = {
  global: "המלצה כללית של SUN CITY (תופיע בכל הדפים)",
  single: "המלצה של סוכן מסוים",
  multi: "המלצה של כמה סוכנים",
};

const emptyForm = (selectedSiteId: string | null, isAdmin: boolean): Form => ({
  name: "",
  type: "",
  quote: "",
  mediaKind: "text",
  imageUrl: "",
  videoUrl: "",
  posterUrl: "",
  scope: {
    mode: isAdmin ? "global" : "single",
    singleSiteId: selectedSiteId ?? "",
    siteIds: [],
  },
  isPublished: true,
  sortOrder: "0",
});

export default function AdminTestimonials({
  sites,
  selectedSiteId,
  isAdmin,
}: {
  sites: ManagedSite[];
  selectedSiteId: string | null;
  isAdmin: boolean;
}) {
  const listFn = useServerFn(adminListTestimonials);
  const saveFn = useServerFn(adminSaveTestimonial);
  const deleteFn = useServerFn(adminDeleteTestimonial);

  const list = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: () => listFn(),
  });

  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const uploader = useMediaUpload("testimonials");

  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await list.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const openNew = () => {
    setMsg(null);
    setErr(null);
    setForm(emptyForm(selectedSiteId, isAdmin));
  };

  const openEdit = (t: TestimonialRow) => {
    setMsg(null);
    setErr(null);
    setForm({
      id: t.id,
      name: t.name,
      type: t.type,
      quote: t.quote,
      mediaKind: t.media_kind,
      imageUrl: t.image_url ?? "",
      videoUrl: t.video_url ?? "",
      posterUrl: t.poster_url ?? "",
      scope: scopeFromRow(t.scope, t.site_ids, selectedSiteId),
      isPublished: t.is_published,
      sortOrder: String(t.sort_order),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    if (!form) return;
    const { scope, siteIds } = scopeToPayload(form.scope, isAdmin, selectedSiteId);
    if (scope === "sites" && !siteIds.length) {
      setErr("יש לבחור לפחות דף אחד להצגה");
      return;
    }
    void run(async () => {
      await saveFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          type: form.type,
          quote: form.quote,
          mediaKind: form.mediaKind,
          imageUrl: form.imageUrl || null,
          videoUrl: form.videoUrl || null,
          posterUrl: form.posterUrl || null,
          scope,
          siteIds,
          ownerSiteId: selectedSiteId,
          isPublished: form.isPublished,
          sortOrder: Number(form.sortOrder) || 0,
        },
      });
      setForm(null);
    }, "ההמלצה נשמרה — השינוי באתר מיידי, והתרגומים נוצרו אוטומטית.");
  };

  /** שינוי פרסום מהכרטיס — שולחים את הרשומה כפי שהיא עם הדגל החדש */
  const togglePublished = (t: TestimonialRow) =>
    run(
      () =>
        saveFn({
          data: {
            id: t.id,
            name: t.name,
            type: t.type,
            quote: t.quote,
            mediaKind: t.media_kind,
            imageUrl: t.image_url,
            videoUrl: t.video_url,
            posterUrl: t.poster_url,
            scope: t.scope,
            siteIds: t.site_ids,
            ownerSiteId: t.owner_site_id ?? selectedSiteId,
            isPublished: !t.is_published,
            sortOrder: t.sort_order,
          },
        }),
      !t.is_published ? "ההמלצה פורסמה" : "ההמלצה הוסתרה מהאתר",
    );

  const remove = (t: TestimonialRow) => {
    if (!window.confirm(`למחוק את ההמלצה של ${t.name}? הפעולה אינה הפיכה.`)) return;
    void run(async () => {
      await deleteFn({ data: { id: t.id } });
      if (form?.id === t.id) setForm(null);
    }, "ההמלצה נמחקה");
  };

  const handleUpload = async (key: "image" | "video" | "poster", file: File) => {
    const url = await uploader.upload(key, key === "video" ? "video" : "image", file);
    if (!url) return;
    if (key === "video") patch({ videoUrl: url });
    else if (key === "poster") patch({ posterUrl: url });
    else patch({ imageUrl: url });
  };

  const rows = list.data ?? [];
  const uploading = uploader.uploadingKey !== null;

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <MessageSquareQuote className="size-5 text-sun" aria-hidden="true" />
          ממליצים
        </h2>
        {!form && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
            הוספת ממליץ
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {isAdmin
          ? "כל המלצה נשמרת בנפרד עם היקף הצגה: כללית של SUN CITY (בכל הדפים), של סוכן מסוים או של כמה סוכנים. הטקסטים מתורגמים אוטומטית לשפות האתר בשמירה."
          : "ההמלצות שאתם מוסיפים מוצגות בדף שלכם, לצד ההמלצות הכלליות של SUN CITY. הטקסטים מתורגמים אוטומטית לשפות האתר בשמירה."}
      </p>

      {msg && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>
      )}
      {(err || uploader.error) && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err ?? uploader.error}
        </p>
      )}

      {/* ---------- טופס ---------- */}
      {form && (
        <div className="mt-4 rounded-xl border border-sun/50 bg-sun/5 p-4">
          <h3 className="text-base font-extrabold text-primary">
            {form.id ? "עריכת המלצה" : "המלצה חדשה"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">שם הממליץ</span>
              <input
                className="field"
                value={form.name}
                maxLength={80}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                סוג העסקה (למשל: קניית דירה בנתניה)
              </span>
              <input
                className="field"
                value={form.type}
                maxLength={60}
                onChange={(e) => patch({ type: e.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                תוכן ההמלצה
              </span>
              <textarea
                className="field min-h-24"
                value={form.quote}
                maxLength={600}
                onChange={(e) => patch({ quote: e.target.value })}
              />
            </label>

            {/* סוג המדיה */}
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                מדיה מצורפת להמלצה
              </span>
              <div
                role="radiogroup"
                aria-label="סוג המדיה"
                className="inline-flex rounded-xl border border-border bg-background p-0.5"
              >
                {KINDS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.mediaKind === value}
                    onClick={() => patch({ mediaKind: value })}
                    className={
                      form.mediaKind === value
                        ? "rounded-lg bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground"
                        : "rounded-lg px-3 py-1.5 text-xs font-bold text-primary"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.mediaKind === "image" && (
              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  תמונת ההמלצה — העלאת קובץ (JPG/PNG/WebP עד 5MB) או קישור
                </span>
                <div className="flex gap-2">
                  <input
                    className="field"
                    dir="ltr"
                    placeholder="https://..."
                    value={form.imageUrl}
                    maxLength={2000}
                    onChange={(e) => patch({ imageUrl: e.target.value })}
                  />
                  <MediaUploadButton
                    uploadKey="image"
                    kind="image"
                    label="העלאת תמונה"
                    icon={ImagePlus}
                    uploadingKey={uploader.uploadingKey}
                    onFile={(file) => void handleUpload("image", file)}
                  />
                </div>
                <UploadProgressBar progress={uploader.progress} uploadKey="image" />
                {form.imageUrl && (
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="mt-2 max-h-40 rounded-lg border border-border object-cover"
                  />
                )}
              </div>
            )}

            {form.mediaKind === "video" && (
              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  סרטון המלצה — העלאת קובץ או קישור (YouTube / כתובת ישירה)
                </span>
                <div className="flex gap-2">
                  <input
                    className="field"
                    dir="ltr"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={form.videoUrl}
                    maxLength={2000}
                    onChange={(e) => patch({ videoUrl: e.target.value })}
                  />
                  <MediaUploadButton
                    uploadKey="video"
                    kind="video"
                    label="העלאת סרטון"
                    icon={Video}
                    uploadingKey={uploader.uploadingKey}
                    onFile={(file) => void handleUpload("video", file)}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  MP4/WebM/MOV עד 500MB — סרטונים גדולים נדחסים אוטומטית בדפדפן
                </p>
                <UploadProgressBar progress={uploader.progress} uploadKey="video" />
                <div className="mt-2 flex gap-2">
                  <input
                    className="field"
                    dir="ltr"
                    placeholder="תמונת פתיחה לסרטון (אופציונלי) — https://..."
                    value={form.posterUrl}
                    maxLength={2000}
                    onChange={(e) => patch({ posterUrl: e.target.value })}
                  />
                  <MediaUploadButton
                    uploadKey="poster"
                    kind="image"
                    label="תמונת פתיחה"
                    icon={ImagePlus}
                    uploadingKey={uploader.uploadingKey}
                    onFile={(file) => void handleUpload("poster", file)}
                  />
                </div>
                <UploadProgressBar progress={uploader.progress} uploadKey="poster" />
              </div>
            )}

            {/* היקף הצגה */}
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                איפה ההמלצה תוצג
              </span>
              <ScopePicker
                value={form.scope}
                onChange={(scope) => patch({ scope })}
                sites={sites}
                isAdmin={isAdmin}
                labels={SCOPE_LABELS}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-primary">
              <input
                type="checkbox"
                className="accent-sun"
                checked={form.isPublished}
                onChange={(e) => patch({ isPublished: e.target.checked })}
              />
              מפורסם באתר
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                סדר הצגה (נמוך = ראשון)
              </span>
              <input
                type="number"
                className="field !w-32"
                value={form.sortOrder}
                onChange={(e) => patch({ sortOrder: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || uploading}
              onClick={submit}
              className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-60"
            >
              {busy ? "שומר ומתרגם…" : form.id ? "שמירת השינויים" : "שמירת ההמלצה"}
            </button>
            <button
              type="button"
              disabled={busy || uploading}
              onClick={() => setForm(null)}
              className="rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary disabled:opacity-60"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* ---------- רשימה ---------- */}
      {list.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען ממליצים…</p>}
      {list.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת הממליצים נכשלה
        </p>
      )}
      {list.data && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          עדיין אין ממליצים — האתר מציג את הממליצים הקבועים עד שתוסיפו.
        </p>
      )}

      <ul className="mt-4 grid gap-3">
        {rows.map((t) => (
          <li
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border border-border p-3 ${
              t.is_published ? "" : "opacity-70"
            }`}
          >
            <Thumb t={t} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-primary">
                {t.name}
                {t.type && <span className="text-muted-foreground"> · {t.type}</span>}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.quote}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span
                  className={
                    t.scope === "global"
                      ? "rounded-full bg-sun/15 px-2 py-0.5 text-primary"
                      : "rounded-full bg-secondary px-2 py-0.5 text-primary"
                  }
                >
                  {scopeLabel(t.scope, t.site_ids, sites)}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                  {KINDS.find(([k]) => k === t.media_kind)?.[1]}
                </span>
                {!t.is_published && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                    מוסתר
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <input
                  type="checkbox"
                  className="accent-sun"
                  checked={t.is_published}
                  disabled={busy}
                  onChange={() => void togglePublished(t)}
                />
                מפורסם
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="עריכה"
                  onClick={() => openEdit(t)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="מחיקה"
                  disabled={busy}
                  onClick={() => remove(t)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-destructive/40 text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** תמונה ממוזערת / אייקון לפי סוג המדיה */
function Thumb({ t }: { t: TestimonialRow }) {
  const src = t.media_kind === "image" ? t.image_url : t.media_kind === "video" ? t.poster_url : null;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="size-14 shrink-0 rounded-lg border border-border object-cover"
      />
    );
  }
  const Icon = t.media_kind === "video" ? Video : MessageSquareQuote;
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary">
      <Icon className="size-6 text-sun" aria-hidden="true" />
    </span>
  );
}
