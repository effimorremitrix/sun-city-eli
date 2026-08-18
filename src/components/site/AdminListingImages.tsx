import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAddListingImages,
  adminDeleteListingImage,
  adminListListingImages,
  adminReorderListingImages,
} from "@/lib/listings.functions";
import type { ListingImage } from "@/lib/listings";

const BUCKET = "listing-images";
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function AdminListingImages({
  listingId,
  onChanged,
}: {
  listingId: string | null;
  onChanged?: () => void;
}) {
  const addImages = useServerFn(adminAddListingImages);
  const removeImage = useServerFn(adminDeleteListingImage);
  const reorder = useServerFn(adminReorderListingImages);
  const listImages = useServerFn(adminListListingImages);

  const [images, setImages] = useState<ListingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!listingId) {
      setImages([]);
      return;
    }
    const rows = (await listImages({ data: { listing_id: listingId } })) as ListingImage[];
    setImages(rows);
  }, [listImages, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!listingId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        כדי להעלות תמונות — יש לשמור קודם את הנכס, ואז לפתוח אותו לעריכה מרשימת הנכסים.
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);

    const chosen = Array.from(files);
    if (images.length + chosen.length > MAX_IMAGES) {
      setErr(`אפשר עד ${MAX_IMAGES} תמונות לנכס`);
      return;
    }
    for (const f of chosen) {
      if (!ALLOWED.includes(f.type)) {
        setErr("סוגי קבצים נתמכים: JPG, PNG, WebP");
        return;
      }
      if (f.size > MAX_SIZE) {
        setErr(`הקובץ ${f.name} גדול מ‑5MB`);
        return;
      }
    }

    setBusy(true);
    try {
      const uploaded: Array<{ storage_path: string }> = [];
      for (const file of chosen) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${listingId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        uploaded.push({ storage_path: path });
      }
      await addImages({ data: { listing_id: listingId, items: uploaded } });
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "העלאת התמונות נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    setImages(next);
    setBusy(true);
    try {
      await reorder({ data: { listing_id: listingId, ids: next.map((i) => i.id) } });
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שינוי הסדר נכשל");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item!);
    setImages(next);
    setBusy(true);
    try {
      await reorder({ data: { listing_id: listingId, ids: next.map((i) => i.id) } });
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "עדכון התמונה הראשית נכשל");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    setBusy(true);
    setErr(null);
    try {
      await removeImage({ data: { id } });
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "מחיקת התמונה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-primary">
          תמונות הנכס ({images.length}/{MAX_IMAGES})
        </h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground">
          <ImagePlus className="size-4" aria-hidden="true" />
          העלאת תמונות
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </label>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        עד {MAX_IMAGES} תמונות, עד 5MB לתמונה (JPG / PNG / WebP). התמונה הראשונה היא התמונה הראשית
        בכרטיס הנכס.
      </p>

      {busy && <p className="mt-2 text-xs font-bold text-primary">מעלה ומעדכן…</p>}
      {err && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, index) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-border">
              <div className="relative">
                <img
                  src={img.url}
                  alt={`תמונת נכס ${index + 1}`}
                  className="aspect-[3/2] w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-2 right-2 rounded-full bg-sun px-2 py-0.5 text-[10px] font-bold text-sun-foreground">
                    ראשית
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={busy || index === images.length - 1}
                    onClick={() => void move(index, 1)}
                    aria-label="הזזה אחורה"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                    aria-label="הזזה קדימה"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void makePrimary(index)}
                    aria-label="הגדרה כתמונה ראשית"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-sun disabled:opacity-40"
                  >
                    <Star className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void del(img.id)}
                    aria-label="מחיקת התמונה"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
