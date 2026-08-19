import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Plus, Trash2, Video } from "lucide-react";
import { saveSiteContent } from "@/lib/site.functions";
import type { LiveFaqItem, LiveTestimonial } from "@/lib/site-live";
import { DICTS } from "@/lib/i18n";
import { acceptFor } from "@/lib/media";
import { VIDEO_TYPES, uploadSiteMedia } from "@/lib/upload-media";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

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
 * עריכת ממליצים (כולל סרטוני המלצה) ושאלות נפוצות — טאב "תוכן העסק".
 * כשאין תוכן שמור במסד, האתר מציג את התוכן הסטטי; אפשר לייבא אותו כבסיס לעריכה.
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

  const [items, setItems] = useState<LiveTestimonial[]>(testimonials ?? []);
  const [faqItems, setFaqItems] = useState<LiveFaqItem[]>(faq ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** מזהה הממליץ שסרטון שלו נמצא כרגע בהעלאה — משבית את שאר כפתורי ההעלאה */
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  /** העלאת קובץ סרטון (mp4/webm) לתיקיית testimonials וכתיבת הכתובת לשדה הקישור */
  const handleVideoUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // איפוס — בחירה חוזרת של אותו קובץ תפעיל שוב onChange
    if (!file) return;
    setErr(null);
    setUploadingId(id);
    try {
      const url = await uploadSiteMedia(file, "testimonials", VIDEO_TYPES);
      // עדכון פונקציונלי: ההעלאה אסינכרונית והרשימה עלולה להשתנות בינתיים
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, videoUrl: url } : x)));
    } catch (uploadErr) {
      setErr(uploadErr instanceof Error ? uploadErr.message : "העלאת הסרטון נכשלה");
    } finally {
      setUploadingId(null);
    }
  };

  useEffect(() => {
    setItems(testimonials ?? []);
    setFaqItems(faq ?? []);
  }, [testimonials, faq]);

  const seedTestimonials = () =>
    setItems(
      DICTS.he.testimonials.items.map((t) => ({
        id: newId(),
        name: t.name,
        type: t.type,
        quote: t.quote,
        videoUrl: "",
      })),
    );

  const seedFaq = () =>
    setFaqItems(DICTS.he.faq.items.map((f) => ({ id: newId(), q: f.q, a: f.a })));

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
            ? items.map((t) => ({ ...t, videoUrl: t.videoUrl ?? "" }))
            : null,
          faq: faqItems.length ? faqItems : null,
        },
      });
      setMsg("הממליצים והשאלות הנפוצות נשמרו — השינויים באתר מיידיים.");
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

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="text-lg font-extrabold text-primary">ממליצים ושאלות נפוצות</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        התוכן כאן מחליף את הממליצים והשאלות הקבועים של האתר. רשימה ריקה = האתר חוזר לתוכן הקבוע. לכל
        ממליץ אפשר לצרף סרטון המלצה — העלאת קובץ (MP4/WebM עד 50MB), קישור YouTube או כתובת ישירה.
        העלאה ממלאת את שדה הקישור, והכול נשמר רק בלחיצה על שמירה.
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
              setItems([...items, { id: newId(), name: "", type: "", quote: "", videoUrl: "" }])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            הוספת ממליץ
          </button>
        </div>
      </div>

      <ul className="mt-3 grid gap-3">
        {items.map((t, i) => (
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
                    onChange={(e) =>
                      setItems(
                        items.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)),
                      )
                    }
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
                    onChange={(e) =>
                      setItems(
                        items.map((x) => (x.id === t.id ? { ...x, type: e.target.value } : x)),
                      )
                    }
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
                    onChange={(e) =>
                      setItems(
                        items.map((x) => (x.id === t.id ? { ...x, quote: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <div className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">
                    סרטון המלצה (אופציונלי) — העלאת קובץ או קישור
                  </span>
                  <div className="flex gap-2">
                    <input
                      className="field"
                      dir="ltr"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={t.videoUrl ?? ""}
                      maxLength={300}
                      onChange={(e) =>
                        setItems(
                          items.map((x) =>
                            x.id === t.id ? { ...x, videoUrl: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    {/* העלאה ב-<label> עוטף — לחיצה טבעית שפותחת את בורר הקבצים */}
                    <label
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 px-3 text-xs font-bold text-primary ${
                        uploadingId ? "cursor-default opacity-60" : "cursor-pointer"
                      }`}
                    >
                      <Video className="size-4 text-sun" aria-hidden="true" />
                      {uploadingId === t.id ? "מעלה…" : "העלאת סרטון"}
                      <input
                        type="file"
                        accept={acceptFor(VIDEO_TYPES)}
                        className="hidden"
                        disabled={uploadingId !== null}
                        onChange={(e) => void handleVideoUpload(t.id, e)}
                      />
                    </label>
                  </div>
                </div>
              </div>
              {rowButtons(
                () => setItems(moveItem(items, i, -1)),
                () => setItems(moveItem(items, i, 1)),
                () => setItems(items.filter((x) => x.id !== t.id)),
              )}
            </div>
          </li>
        ))}
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
        disabled={busy}
        onClick={() => void save()}
        className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
      >
        שמירת ממליצים ושאלות נפוצות
      </button>
    </section>
  );
}
