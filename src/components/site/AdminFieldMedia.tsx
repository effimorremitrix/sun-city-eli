import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clapperboard, ImagePlus, Pencil, Plus, Trash2, Video } from "lucide-react";
import {
  FIELD_CATEGORIES,
  adminDeleteFieldMedia,
  adminListFieldMedia,
  adminSaveFieldMedia,
  type FieldCategory,
  type FieldMediaRow,
} from "@/lib/field-media.functions";
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
 * טאב "מהשטח" — סרטונים ותמונות מעסקאות (field_media): חתימות, מסירת
 * מפתחות, לקוחות מרוצים, המשרד. אותו מודל היקף כמו הממליצים: כללי /
 * דף אחד / כמה דפים; סוכן — תמיד הדף שלו.
 * ============================================================
 */

const CATEGORY_LABELS: Record<FieldCategory, string> = {
  signing: "חתימת חוזה",
  deal_closed: "עסקה נסגרה",
  keys: "מסירת מפתחות",
  happy_clients: "לקוחות מרוצים",
  office: "מהמשרד",
  other: "אחר",
};

type MediaKind = FieldMediaRow["media_kind"];

type Form = {
  id?: string;
  title: string;
  description: string;
  category: FieldCategory;
  mediaKind: MediaKind;
  mediaUrl: string;
  posterUrl: string;
  happenedAt: string;
  scope: ScopeValue;
  isPublished: boolean;
  sortOrder: string;
};

const SCOPE_LABELS = {
  global: "כללי של SUN CITY (יופיע בכל הדפים)",
  single: "של סוכן מסוים (דף אחד)",
  multi: "של כמה סוכנים (כמה דפים)",
};

const emptyForm = (selectedSiteId: string | null, isAdmin: boolean): Form => ({
  title: "",
  description: "",
  category: "signing",
  mediaKind: "video",
  mediaUrl: "",
  posterUrl: "",
  happenedAt: "",
  scope: {
    mode: isAdmin ? "global" : "single",
    singleSiteId: selectedSiteId ?? "",
    siteIds: [],
  },
  isPublished: true,
  sortOrder: "0",
});

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("he-IL");
};

export default function AdminFieldMedia({
  sites,
  selectedSiteId,
  isAdmin,
}: {
  sites: ManagedSite[];
  selectedSiteId: string | null;
  isAdmin: boolean;
}) {
  const listFn = useServerFn(adminListFieldMedia);
  const saveFn = useServerFn(adminSaveFieldMedia);
  const deleteFn = useServerFn(adminDeleteFieldMedia);

  const list = useQuery({
    queryKey: ["admin-field-media"],
    queryFn: () => listFn(),
  });

  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const uploader = useMediaUpload("field");

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

  const openEdit = (m: FieldMediaRow) => {
    setMsg(null);
    setErr(null);
    setForm({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      category: m.category,
      mediaKind: m.media_kind,
      mediaUrl: m.media_url,
      posterUrl: m.poster_url ?? "",
      happenedAt: m.happened_at ?? "",
      scope: scopeFromRow(m.scope, m.site_ids, selectedSiteId),
      isPublished: m.is_published,
      sortOrder: String(m.sort_order),
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
    if (!form.mediaUrl) {
      setErr("יש להעלות סרטון/תמונה או להזין קישור");
      return;
    }
    void run(async () => {
      await saveFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title,
          description: form.description || null,
          category: form.category,
          mediaKind: form.mediaKind,
          mediaUrl: form.mediaUrl,
          posterUrl: form.posterUrl || null,
          scope,
          siteIds,
          ownerSiteId: selectedSiteId,
          isPublished: form.isPublished,
          sortOrder: Number(form.sortOrder) || 0,
          happenedAt: form.happenedAt || null,
        },
      });
      setForm(null);
    }, "הפריט נשמר — השינוי באתר מיידי, והתרגומים נוצרו אוטומטית.");
  };

  const togglePublished = (m: FieldMediaRow) =>
    run(
      () =>
        saveFn({
          data: {
            id: m.id,
            title: m.title,
            description: m.description,
            category: m.category,
            mediaKind: m.media_kind,
            mediaUrl: m.media_url,
            posterUrl: m.poster_url,
            scope: m.scope,
            siteIds: m.site_ids,
            ownerSiteId: m.owner_site_id ?? selectedSiteId,
            isPublished: !m.is_published,
            sortOrder: m.sort_order,
            happenedAt: m.happened_at,
          },
        }),
      !m.is_published ? "הפריט פורסם" : "הפריט הוסתר מהאתר",
    );

  const remove = (m: FieldMediaRow) => {
    if (!window.confirm(`למחוק את "${m.title}"? הפעולה אינה הפיכה.`)) return;
    void run(async () => {
      await deleteFn({ data: { id: m.id } });
      if (form?.id === m.id) setForm(null);
    }, "הפריט נמחק");
  };

  const handleUpload = async (key: "media" | "poster", file: File) => {
    const kind = key === "poster" ? "image" : form?.mediaKind === "image" ? "image" : "video";
    const url = await uploader.upload(key, kind, file);
    if (!url) return;
    if (key === "poster") patch({ posterUrl: url });
    else patch({ mediaUrl: url });
  };

  const rows = list.data ?? [];
  const uploading = uploader.uploadingKey !== null;
  const isVideo = form?.mediaKind === "video";

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Clapperboard className="size-5 text-sun" aria-hidden="true" />
          מהשטח — סרטונים ותמונות מעסקאות
        </h2>
        {!form && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
            הוספת פריט
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        חתימות על חוזה, מסירת מפתחות, לקוחות מרוצים ורגעים מהמשרד — מוצגים בסקשן "מהשטח" באתר.
        {isAdmin
          ? " לכל פריט בוחרים היקף: כללי (כל הדפים), דף של סוכן אחד או כמה דפים."
          : " הפריטים שאתם מעלים מוצגים בדף שלכם."}{" "}
        הכותרת והתיאור מתורגמים אוטומטית לשפות האתר.
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
            {form.id ? "עריכת פריט" : "פריט חדש"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">כותרת</span>
              <input
                className="field"
                value={form.title}
                maxLength={120}
                placeholder="למשל: מסירת מפתחות למשפחת לוי"
                onChange={(e) => patch({ title: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">קטגוריה</span>
              <select
                className="field"
                value={form.category}
                onChange={(e) => patch({ category: e.target.value as FieldCategory })}
              >
                {FIELD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                תיאור קצר (אופציונלי)
              </span>
              <textarea
                className="field min-h-20"
                value={form.description}
                maxLength={600}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </label>

            {/* סוג המדיה */}
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">סוג המדיה</span>
              <div
                role="radiogroup"
                aria-label="סוג המדיה"
                className="inline-flex rounded-xl border border-border bg-background p-0.5"
              >
                {(
                  [
                    ["video", "סרטון"],
                    ["image", "תמונה"],
                  ] as Array<[MediaKind, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.mediaKind === value}
                    onClick={() => patch({ mediaKind: value, mediaUrl: "" })}
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

            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {isVideo
                  ? "הסרטון — העלאת קובץ (MP4/WebM/MOV עד 500MB) או כתובת ישירה"
                  : "התמונה — העלאת קובץ (JPG/PNG/WebP עד 5MB) או קישור"}
              </span>
              <div className="flex gap-2">
                <input
                  className="field"
                  dir="ltr"
                  placeholder="https://..."
                  value={form.mediaUrl}
                  maxLength={2000}
                  onChange={(e) => patch({ mediaUrl: e.target.value })}
                />
                <MediaUploadButton
                  uploadKey="media"
                  kind={isVideo ? "video" : "image"}
                  label={isVideo ? "העלאת סרטון" : "העלאת תמונה"}
                  icon={isVideo ? Video : ImagePlus}
                  uploadingKey={uploader.uploadingKey}
                  onFile={(file) => void handleUpload("media", file)}
                />
              </div>
              {isVideo && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  סרטונים גדולים נדחסים אוטומטית בדפדפן לפני ההעלאה — ייתכן שזה ייקח כמה דקות.
                </p>
              )}
              <UploadProgressBar progress={uploader.progress} uploadKey="media" />
              {form.mediaUrl &&
                (isVideo ? (
                  <video
                    src={form.mediaUrl}
                    poster={form.posterUrl || undefined}
                    preload="metadata"
                    controls
                    className="mt-2 max-h-48 rounded-lg border border-border bg-black"
                  />
                ) : (
                  <img
                    src={form.mediaUrl}
                    alt=""
                    className="mt-2 max-h-48 rounded-lg border border-border object-cover"
                  />
                ))}
            </div>

            {isVideo && (
              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  תמונת פתיחה לסרטון (אופציונלי)
                </span>
                <div className="flex gap-2">
                  <input
                    className="field"
                    dir="ltr"
                    placeholder="https://..."
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

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                תאריך האירוע (אופציונלי)
              </span>
              <input
                type="date"
                className="field"
                value={form.happenedAt}
                onChange={(e) => patch({ happenedAt: e.target.value })}
              />
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

            {/* היקף הצגה */}
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                איפה הפריט יוצג
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
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || uploading}
              onClick={submit}
              className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground disabled:opacity-60"
            >
              {busy ? "שומר ומתרגם…" : form.id ? "שמירת השינויים" : "שמירת הפריט"}
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

      {/* ---------- רשימה (גריד) ---------- */}
      {list.isLoading && <p className="mt-4 text-sm text-muted-foreground">טוען פריטים…</p>}
      {list.isError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
          טעינת הפריטים נכשלה
        </p>
      )}
      {list.data && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          עדיין אין פריטים — הסקשן "מהשטח" באתר יוצג רק כשיהיה לפחות פריט מפורסם אחד.
        </p>
      )}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => (
          <li
            key={m.id}
            className={`flex flex-col overflow-hidden rounded-xl border border-border ${
              m.is_published ? "" : "opacity-70"
            }`}
          >
            <div className="relative aspect-video bg-secondary">
              {m.media_kind === "video" ? (
                <video
                  src={m.media_url}
                  poster={m.poster_url ?? undefined}
                  preload="metadata"
                  controls
                  className="size-full object-cover"
                />
              ) : (
                <img src={m.media_url} alt="" className="size-full object-cover" loading="lazy" />
              )}
              <span className="absolute top-2 start-2 rounded-full bg-sun px-2 py-0.5 text-[11px] font-bold text-sun-foreground">
                {CATEGORY_LABELS[m.category] ?? m.category}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <p className="font-bold text-primary">{m.title}</p>
              {m.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span
                  className={
                    m.scope === "global"
                      ? "rounded-full bg-sun/15 px-2 py-0.5 text-primary"
                      : "rounded-full bg-secondary px-2 py-0.5 text-primary"
                  }
                >
                  {scopeLabel(m.scope, m.site_ids, sites)}
                </span>
                {m.happened_at && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {fmtDate(m.happened_at)}
                  </span>
                )}
                {!m.is_published && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                    מוסתר
                  </span>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <input
                    type="checkbox"
                    className="accent-sun"
                    checked={m.is_published}
                    disabled={busy}
                    onChange={() => void togglePublished(m)}
                  />
                  מפורסם
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="עריכה"
                    onClick={() => openEdit(m)}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="מחיקה"
                    disabled={busy}
                    onClick={() => remove(m)}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-destructive/40 text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
