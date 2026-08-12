import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyWorkspace,
  saveMyContent,
  saveMyItem,
  deleteMyItem,
  claimDeveloperRole,
  createClientSite,
  listAllSites,
} from "@/lib/site.functions";
import { DEFAULT_BUSINESS, DEFAULT_TEXTS, type LiveBusiness, type LiveTexts } from "@/lib/site-live";
import { EditLinksPanel } from "@/components/admin/EditLinksPanel";

const title = 'ניהול תוכן האתר | סאן סיטי נדל"ן';
const description = 'אזור הניהול הפרטי של סאן סיטי נדל"ן — עריכת פרטי העסק, טקסטים ופריטים לאתר.';

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">האזור לא נטען</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </main>
  ),
});

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

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchWorkspace = useServerFn(getMyWorkspace);
  const saveContent = useServerFn(saveMyContent);
  const saveItem = useServerFn(saveMyItem);
  const removeItem = useServerFn(deleteMyItem);
  const claimDev = useServerFn(claimDeveloperRole);

  const workspace = useQuery({ queryKey: ["workspace"], queryFn: () => fetchWorkspace() });

  const [business, setBusiness] = useState<LiveBusiness>(DEFAULT_BUSINESS);
  const [texts, setTexts] = useState<LiveTexts>(DEFAULT_TEXTS);
  const [item, setItem] = useState<ItemForm>(emptyItem);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (workspace.data) {
      setBusiness(workspace.data.live.business);
      setTexts(workspace.data.live.texts);
    }
  }, [workspace.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workspace"] });

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await fn();
      setNote(okMsg);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שגיאה בשמירה");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const site = workspace.data?.site ?? null;
  const items = workspace.data?.items ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">אזור ניהול</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {site ? `אתר: ${site.name} (${site.slug})` : "לא שויך אתר לחשבון זה"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-primary">
            לאתר
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-primary"
          >
            יציאה
          </button>
        </div>
      </div>

      {note && <p className="mt-4 rounded-lg bg-sun/15 p-3 text-sm font-bold text-primary">{note}</p>}
      {err && (
        <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {err}
        </p>
      )}

      {workspace.isLoading && <p className="mt-6 text-sm text-muted-foreground">טוען…</p>}

      {workspace.data && !workspace.data.isAdmin && !site && (
        <div className="soft-card mt-6 p-5">
          <p className="text-sm text-muted-foreground">
            החשבון שלך עדיין לא משויך לאתר. יש לפנות למנהל המערכת.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => claimDev(), "קיבלת סמכויות מפתח")}
            className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-bold text-primary"
          >
            הפוך אותי למפתח (אפשרי רק אם אין מפתח במערכת)
          </button>
        </div>
      )}

      {site && (
        <>
          {/* פרטי העסק */}
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
                <label className="block" key={key}>
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
              onClick={() =>
                run(
                  () =>
                    saveContent({
                      data: {
                        business: business as unknown as Record<string, unknown>,
                        texts: texts as unknown as Record<string, unknown>,
                      },
                    }),
                  "התוכן נשמר ומופיע באתר",
                )
              }
              className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
            >
              שמירת פרטי העסק
            </button>
          </section>

          {/* פריטים */}
          <section className="soft-card mt-6 p-5">
            <h2 className="text-lg font-extrabold text-primary">פריטים באתר</h2>
            <p className="mt-1 text-xs text-muted-foreground">נכסים, שירותים או מוצרים שמוצגים בעמוד הבית.</p>

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
                onClick={() =>
                  run(async () => {
                    await saveItem({
                      data: {
                        ...(item.id ? { id: item.id } : {}),
                        kind: item.kind,
                        title: item.title,
                        description: item.description || null,
                        price: item.price ? Number(item.price) : null,
                        price_note: item.price_note || null,
                        image_url: item.image_url || null,
                        sort_order: Number(item.sort_order) || 0,
                        is_active: item.is_active,
                      },
                    });
                    setItem(emptyItem);
                  }, "הפריט נשמר")
                }
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
                      {it.kind} · {it.price ? it.price.toLocaleString("he-IL") + " ₪" : "ללא מחיר"} ·{" "}
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
                      onClick={() => run(() => removeItem({ data: { id: it.id } }), "הפריט נמחק")}
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
      )}

      {workspace.data?.isAdmin && <DeveloperPanel onDone={refresh} />}
    </main>
  );
}

function DeveloperPanel({ onDone }: { onDone: () => void }) {
  const createSite = useServerFn(createClientSite);
  const fetchSites = useServerFn(listAllSites);
  const sites = useQuery({ queryKey: ["all-sites"], queryFn: () => fetchSites() });
  const [form, setForm] = useState({ email: "", password: "", siteName: "", slug: "" });
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await createSite({ data: form });
      setNote("נוצר לקוח חדש עם אתר משויך");
      setForm({ email: "", password: "", siteName: "", slug: "" });
      await sites.refetch();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "היצירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="text-lg font-extrabold text-primary">סמכויות מפתח</h2>
      <p className="mt-1 text-xs text-muted-foreground">יצירת לקוח חדש ואתר שמשויך אליו בלבד.</p>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">אימייל הלקוח</span>
          <input
            className="field"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">סיסמה ראשונית</span>
          <input
            className="field"
            type="text"
            dir="ltr"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">שם האתר</span>
          <input
            className="field"
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">מזהה אתר (slug)</span>
          <input
            className="field"
            dir="ltr"
            placeholder="sun-city"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
        </label>

        {err && (
          <p role="alert" className="sm:col-span-2 text-sm font-bold text-destructive">
            {err}
          </p>
        )}
        {note && <p className="sm:col-span-2 text-sm font-bold text-primary">{note}</p>}

        <button
          type="submit"
          disabled={busy}
          className="sm:col-span-2 rounded-xl bg-navy py-3 text-base font-bold text-navy-foreground disabled:opacity-60"
        >
          יצירת לקוח ואתר
        </button>
      </form>

      <ul className="mt-5 divide-y divide-border">
        {(sites.data ?? []).map((s) => (
          <li key={s.id} className="py-2 text-sm">
            <span className="font-bold text-primary">{s.name}</span>{" "}
            <span className="text-muted-foreground" dir="ltr">
              /{s.slug} · {s.profiles?.email ?? s.owner_id}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
