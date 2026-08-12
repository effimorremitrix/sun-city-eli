import { useEffect, useState } from "react";
import { DEFAULT_BUSINESS, DEFAULT_TEXTS, type LiveBusiness, type LiveTexts } from "@/lib/site-live";

export type EditorItem = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  price: number | null;
  price_note: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type ItemForm = {
  id?: string;
  kind: string;
  title: string;
  description: string;
  price: string;
  price_note: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const emptyItem: ItemForm = {
  kind: "property",
  title: "",
  description: "",
  price: "",
  price_note: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
};

type Props = {
  business: LiveBusiness;
  texts: LiveTexts;
  items: EditorItem[];
  busy: boolean;
  onSaveContent: (business: LiveBusiness, texts: LiveTexts) => Promise<void>;
  onSaveItem: (data: {
    id?: string;
    kind: string;
    title: string;
    description: string | null;
    price: number | null;
    price_note: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
  }) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
};

/** ממשק העריכה המשותף — משמש גם את אזור הניהול וגם את קישור העריכה של הלקוח */
export function ContentEditor({
  business: initialBusiness,
  texts: initialTexts,
  items,
  busy,
  onSaveContent,
  onSaveItem,
  onDeleteItem,
}: Props) {
  const [business, setBusiness] = useState<LiveBusiness>(initialBusiness ?? DEFAULT_BUSINESS);
  const [texts, setTexts] = useState<LiveTexts>(initialTexts ?? DEFAULT_TEXTS);
  const [item, setItem] = useState<ItemForm>(emptyItem);

  useEffect(() => {
    setBusiness(initialBusiness);
    setTexts(initialTexts);
  }, [initialBusiness, initialTexts]);

  return (
    <>
      <section className="soft-card mt-6 p-5">
        <h2 className="text-lg font-extrabold text-primary">פרטי העסק</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "שם העסק"],
              ["tagline", "סלוגן"],
              ["subtitle", "תת־כותרת"],
              ["address", "כתובת"],
              ["phone", "טלפון להצגה"],
              ["phoneTel", "טלפון לחיוג (ספרות)"],
              ["email", "אימייל"],
              ["license", "מספר רישיון"],
            ] as Array<[keyof LiveBusiness, string]>
          ).map(([key, label]) => (
            <label className="block" key={String(key)}>
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
              <input
                className="field"
                value={String(business[key] ?? "")}
                onChange={(e) => setBusiness({ ...business, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <h3 className="mt-5 text-sm font-extrabold text-primary">שעות פעילות</h3>
        <div className="mt-2 grid gap-2">
          {business.hours.map((h, idx) => (
            <div className="grid grid-cols-2 gap-2" key={idx}>
              <input
                className="field"
                value={h.day}
                onChange={(e) => {
                  const hours = [...business.hours];
                  hours[idx] = { ...h, day: e.target.value };
                  setBusiness({ ...business, hours });
                }}
              />
              <input
                className="field"
                value={h.value}
                onChange={(e) => {
                  const hours = [...business.hours];
                  hours[idx] = { ...h, value: e.target.value };
                  setBusiness({ ...business, hours });
                }}
              />
            </div>
          ))}
        </div>

        <h3 className="mt-5 text-sm font-extrabold text-primary">טקסטים בראש האתר</h3>
        <div className="mt-2 grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כותרת ראשית</span>
            <input
              className="field"
              value={texts.heroTitle}
              onChange={(e) => setTexts({ ...texts, heroTitle: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כותרת משנה</span>
            <textarea
              className="field min-h-20"
              value={texts.heroSubtitle}
              onChange={(e) => setTexts({ ...texts, heroSubtitle: e.target.value })}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onSaveContent(business, texts)}
          className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
        >
          שמירת פרטי העסק
        </button>
      </section>

      <section className="soft-card mt-6 p-5">
        <h2 className="text-lg font-extrabold text-primary">נכסים ופריטים באתר</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          מלאו רק מידע אמיתי. כשאין נתון — השאירו ריק ולא יוצג באתר.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כותרת</span>
            <input className="field" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סוג</span>
            <select className="field" value={item.kind} onChange={(e) => setItem({ ...item, kind: e.target.value })}>
              <option value="property">נכס</option>
              <option value="service">שירות</option>
              <option value="product">מוצר</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">תיאור</span>
            <textarea
              className="field min-h-20"
              value={item.description}
              onChange={(e) => setItem({ ...item, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">מחיר (מספר)</span>
            <input
              className="field"
              inputMode="numeric"
              value={item.price}
              onChange={(e) => setItem({ ...item, price: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">הערת מחיר</span>
            <input
              className="field"
              value={item.price_note}
              onChange={(e) => setItem({ ...item, price_note: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כתובת תמונה (URL)</span>
            <input
              className="field"
              dir="ltr"
              value={item.image_url}
              onChange={(e) => setItem({ ...item, image_url: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סדר הצגה</span>
            <input
              className="field"
              inputMode="numeric"
              value={item.sort_order}
              onChange={(e) => setItem({ ...item, sort_order: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={item.is_active}
              onChange={(e) => setItem({ ...item, is_active: e.target.checked })}
            />
            <span className="text-sm font-bold text-primary">מוצג באתר</span>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              await onSaveItem({
                ...(item.id ? { id: item.id } : {}),
                kind: item.kind,
                title: item.title,
                description: item.description || null,
                price: item.price ? Number(item.price) : null,
                price_note: item.price_note || null,
                image_url: item.image_url || null,
                sort_order: Number(item.sort_order) || 0,
                is_active: item.is_active,
              });
              setItem(emptyItem);
            }}
            className="flex-1 rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
          >
            {item.id ? "עדכון פריט" : "הוספת פריט"}
          </button>
          {item.id && (
            <button
              type="button"
              onClick={() => setItem(emptyItem)}
              className="rounded-xl border border-border px-4 text-sm font-bold text-primary"
            >
              ביטול
            </button>
          )}
        </div>

        <ul className="mt-5 divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-bold text-primary">{it.title}</p>
                <p className="text-xs text-muted-foreground">
                  {it.kind} · {it.price ? it.price.toLocaleString("he-IL") + " ₪" : "אין מידע על מחיר"} ·{" "}
                  {it.is_active ? "מוצג" : "מוסתר"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setItem({
                      id: it.id,
                      kind: it.kind,
                      title: it.title,
                      description: it.description ?? "",
                      price: it.price != null ? String(it.price) : "",
                      price_note: it.price_note ?? "",
                      image_url: it.image_url ?? "",
                      sort_order: String(it.sort_order),
                      is_active: it.is_active,
                    })
                  }
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-primary"
                >
                  עריכה
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDeleteItem(it.id)}
                  className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive"
                >
                  מחיקה
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="py-3 text-sm text-muted-foreground">אין פריטים עדיין.</li>}
        </ul>
      </section>
    </>
  );
}
