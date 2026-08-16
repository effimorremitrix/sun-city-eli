import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListSoldProperties,
  adminSaveSoldProperty,
  adminDeleteSoldProperty,
  type SoldProperty,
} from "@/lib/sold.functions";
import { neighborhoods } from "@/lib/site-data";

const BUCKET = "listing-images";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type Form = {
  id?: string;
  address: string;
  neighborhood: string;
  note: string;
  sold_at: string;
  sort_order: string;
  is_published: boolean;
  storage_path: string | null;
  image_url: string;
  previewUrl: string | null;
};

const emptyForm: Form = {
  address: "",
  neighborhood: "",
  note: "",
  sold_at: "",
  sort_order: "0",
  is_published: true,
  storage_path: null,
  image_url: "",
  previewUrl: null,
};

/** ניהול מדור "נמכר על ידינו": העלאת תמונה של דירה שנמכרה + פרטיה */
export function AdminSold({ siteId }: { siteId: string }) {
  const listSold = useServerFn(adminListSoldProperties);
  const saveSold = useServerFn(adminSaveSoldProperty);
  const deleteSold = useServerFn(adminDeleteSoldProperty);

  const sold = useQuery({
    queryKey: ["admin-sold", siteId],
    queryFn: () => listSold({ data: { siteId } }),
  });

  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await sold.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setErr(null);
    if (!ALLOWED.includes(file.type)) return setErr("סוגי קבצים נתמכים: JPG, PNG, WebP");
    if (file.size > MAX_SIZE) return setErr("הקובץ גדול מ-5MB");

    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `sold/${siteId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      setForm((f) => ({ ...f, storage_path: path, previewUrl: URL.createObjectURL(file) }));
      setMsg("התמונה הועלתה — עכשיו שמרו את הפרטים");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "העלאת התמונה נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const submit = () =>
    run(async () => {
      await saveSold({
        data: {
          ...(form.id ? { id: form.id } : {}),
          siteId,
          address: form.address,
          neighborhood: form.neighborhood || null,
          note: form.note || null,
          sold_at: form.sold_at || null,
          is_published: form.is_published,
          sort_order: Number(form.sort_order) || 0,
          storage_path: form.storage_path,
          image_url: form.image_url || null,
        },
      });
      setForm(emptyForm);
    }, "הדירה שנמכרה נשמרה ותוצג באתר");

  const edit = (s: SoldProperty) =>
    setForm({
      id: s.id,
      address: s.address,
      neighborhood: s.neighborhood ?? "",
      note: s.note ?? "",
      sold_at: s.sold_at ?? "",
      sort_order: String(s.sort_order),
      is_published: s.is_published,
      storage_path: s.storage_path,
      image_url: s.image_url ?? "",
      previewUrl: s.url,
    });

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <BadgeCheck className="size-5 text-sun" aria-hidden="true" />
        {form.id ? "עריכת דירה שנמכרה" : "הוספת דירה שנמכרה"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        הדירות מוצגות באתר במדור &quot;נמכר על ידינו&quot; — תמונה עגולה עם חותמת &quot;נמכר&quot;
        והכתובת, כמו בפוסטרים של המשרד. מומלץ להעלות רק עסקאות אמיתיות.
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            כתובת (למשל: יוספטל 7 נתניה)
          </span>
          <input
            className="field"
            value={form.address}
            maxLength={200}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">שכונה</span>
          <select
            className="field"
            value={form.neighborhood}
            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
          >
            <option value="">ללא</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            הערה (למשל: נמכר תוך 3 שבועות)
          </span>
          <input
            className="field"
            value={form.note}
            maxLength={200}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">תאריך המכירה</span>
          <input
            className="field"
            type="date"
            dir="ltr"
            value={form.sold_at}
            onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">סדר הצגה</span>
          <input
            className="field"
            type="number"
            dir="ltr"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
          />
          מוצג באתר
        </label>
      </div>

      {/* תמונה */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {form.previewUrl && (
          <img
            src={form.previewUrl}
            alt="תצוגה מקדימה של הדירה שנמכרה"
            className="size-24 rounded-full border-4 border-sun object-cover"
          />
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground">
          <ImagePlus className="size-4" aria-hidden="true" />
          {form.storage_path || form.previewUrl ? "החלפת תמונה" : "העלאת תמונת הדירה"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFile(e.target.files)}
          />
        </label>
        <span className="text-xs text-muted-foreground">עד 5MB (JPG / PNG / WebP)</span>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={busy || form.address.trim().length < 2}
          onClick={submit}
          className="flex-1 rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
        >
          {form.id ? "עדכון" : "הוספה למדור"}
        </button>
        {form.id && (
          <button
            type="button"
            onClick={() => setForm(emptyForm)}
            className="rounded-xl border border-primary/30 px-5 py-3 text-sm font-bold text-primary"
          >
            ביטול
          </button>
        )}
      </div>

      {/* הרשימה */}
      <h3 className="mt-8 text-base font-extrabold text-primary">הדירות שנמכרו במדור</h3>
      {sold.isLoading && <p className="mt-2 text-sm text-muted-foreground">טוען…</p>}
      {!sold.isLoading && (sold.data ?? []).length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">עדיין אין דירות במדור.</p>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {(sold.data ?? []).map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
            {s.url ? (
              <img
                src={s.url}
                alt={`נמכר — ${s.address}`}
                className="size-16 shrink-0 rounded-full border-2 border-sun object-cover"
              />
            ) : (
              <div className="size-16 shrink-0 rounded-full border-2 border-sun bg-secondary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-primary">
                {s.address}{" "}
                {!s.is_published && <span className="text-xs text-muted-foreground">(מוסתר)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[s.neighborhood, s.note].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-sm">
              <button type="button" className="underline" onClick={() => edit(s)}>
                עריכה
              </button>
              <button
                type="button"
                disabled={busy}
                className="text-destructive underline"
                onClick={() => run(() => deleteSold({ data: { id: s.id } }), "הדירה הוסרה מהמדור")}
              >
                מחיקה
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
