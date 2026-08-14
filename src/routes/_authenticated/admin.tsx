import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSite, saveSiteContent, claimAdminRole } from "@/lib/site.functions";
import { adminListListings, adminSaveListing, adminDeleteListing } from "@/lib/listings.functions";
import { formatListingPrice, type Listing } from "@/lib/listings";
import { neighborhoods } from "@/lib/site-data";
import type { LiveBusiness, LiveTexts } from "@/lib/site-live";
import { AdminUsers } from "@/components/site/AdminUsers";

type TabKey = "listings" | "content" | "users";


const title = 'אזור ניהול | סאן סיטי נדל"ן';
const description = 'אזור הניהול של אתר סאן סיטי נדל"ן — ניהול נכסים, תוכן ופרטי העסק.';

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
});

type ListingForm = {
  id?: string;
  title: string;
  deal_type: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  price: string;
  rooms: string;
  size_sqm: string;
  floor: string;
  has_mamad: boolean;
  has_elevator: boolean;
  has_parking: boolean;
  has_balcony: boolean;
  tag: string;
  image_url: string;
  is_published: boolean;
  sort_order: string;
};

const emptyForm: ListingForm = {
  title: "",
  deal_type: "מכירה",
  description: "",
  city: "נתניה",
  neighborhood: "",
  address: "",
  price: "",
  rooms: "",
  size_sqm: "",
  floor: "",
  has_mamad: false,
  has_elevator: false,
  has_parking: false,
  has_balcony: false,
  tag: "",
  image_url: "",
  is_published: true,
  sort_order: "0",
};

const toForm = (l: Listing): ListingForm => ({
  id: l.id,
  title: l.title,
  deal_type: l.deal_type,
  description: l.description ?? "",
  city: l.city,
  neighborhood: l.neighborhood ?? "",
  address: l.address ?? "",
  price: l.price == null ? "" : String(l.price),
  rooms: l.rooms == null ? "" : String(l.rooms),
  size_sqm: l.size_sqm == null ? "" : String(l.size_sqm),
  floor: l.floor ?? "",
  has_mamad: l.has_mamad,
  has_elevator: l.has_elevator,
  has_parking: l.has_parking,
  has_balcony: l.has_balcony,
  tag: l.tag ?? "",
  image_url: l.image_url ?? "",
  is_published: l.is_published,
  sort_order: String(l.sort_order),
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const str = (v: string) => (v.trim() === "" ? null : v.trim());

function AdminPage() {
  const fetchSite = useServerFn(getAdminSite);
  const fetchListings = useServerFn(adminListListings);
  const saveContent = useServerFn(saveSiteContent);
  const saveListing = useServerFn(adminSaveListing);
  const removeListing = useServerFn(adminDeleteListing);
  const claim = useServerFn(claimAdminRole);

  const site = useQuery({ queryKey: ["admin-site"], queryFn: () => fetchSite() });
  const listings = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => fetchListings(),
    enabled: site.data?.isAdmin === true,
  });

  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>("listings");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<ListingForm>(emptyForm);

  const [business, setBusiness] = useState<LiveBusiness | null>(null);
  const [texts, setTexts] = useState<LiveTexts | null>(null);
  useEffect(() => {
    if (site.data?.live) {
      setBusiness(site.data.live.business);
      setTexts(site.data.live.texts);
    }
  }, [site.data]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await Promise.all([site.refetch(), listings.refetch()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const submitListing = () =>
    run(async () => {
      const res = (await saveListing({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title,
          deal_type: form.deal_type,
          description: str(form.description),
          city: form.city || "נתניה",
          neighborhood: str(form.neighborhood),
          address: str(form.address),
          price: num(form.price),
          rooms: num(form.rooms),
          size_sqm: num(form.size_sqm),
          floor: str(form.floor),
          has_mamad: form.has_mamad,
          has_elevator: form.has_elevator,
          has_parking: form.has_parking,
          has_balcony: form.has_balcony,
          tag: str(form.tag),
          image_url: str(form.image_url),
          image_key: null,
          is_published: form.is_published,
          sort_order: Number(form.sort_order) || 0,
        },
      })) as { id: string; matched: number; emailsSent: number; emailsPending: number };
      setForm((f) => ({ ...f, id: res.id }));
      setMsg(
        `הנכס נשמר. אפשר להעלות עכשיו תמונות לנכס. נשלחו התראות ל-${res.matched} פרופילי חיפוש (מיילים שנשלחו: ${res.emailsSent}, ממתינים: ${res.emailsPending}).`,
      );

    }, "הנכס נשמר");

  if (site.isLoading) {
    return <main className="p-8 text-center text-muted-foreground">טוען…</main>;
  }

  if (!site.data?.isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="soft-card p-6 text-center">
          <h1 className="text-xl font-extrabold text-primary">אין לך הרשאת ניהול</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            האזור הזה מיועד למנהל האתר בלבד. אם אתם מחפשים דירה — האזור האישי שלכם כאן.
          </p>
          <Link
            to="/account"
            className="mt-4 inline-block rounded-xl bg-sun px-5 py-3 text-sm font-bold text-sun-foreground"
          >
            לאזור האישי
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => claim(), "קיבלת הרשאת ניהול")}
            className="mt-4 block w-full text-xs text-muted-foreground underline"
          >
            הגדרת החשבון הזה כמנהל הראשון של המערכת
          </button>
          {err && (
            <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
              {err}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-primary">אזור ניהול</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/" className="underline">
            לאתר
          </Link>
          <Link to="/account" className="underline">
            הגדרות חשבון
          </Link>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="underline"
          >
            יציאה
          </button>
        </div>
      </div>

      {msg && <p className="mt-4 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>}
      {err && (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {err}
        </p>
      )}

      {/* טאבים */}
      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["listings", "נכסים"],
            ["content", "תוכן העסק"],
            ["users", "משתמשים רשומים"],
          ] as Array<[TabKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={
              tab === key
                ? "rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
                : "rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && <AdminUsers />}

      {/* ניהול נכסים */}
      {tab === "listings" && (
      <section className="soft-card mt-6 p-5">

        <h2 className="text-lg font-extrabold text-primary">{form.id ? "עריכת נכס" : "הוספת נכס"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          כל נכס שמפורסם מייצר התראה אוטומטית לכל לקוח שהפרופיל שלו תואם. אין להזין נכס שאינו אמיתי.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כותרת הנכס</span>
            <input className="field" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סוג עסקה</span>
            <select className="field" value={form.deal_type} onChange={(e) => setForm({ ...form, deal_type: e.target.value })}>
              <option value="מכירה">מכירה</option>
              <option value="השכרה">השכרה</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">שכונה</span>
            <select className="field" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}>
              <option value="">אין מידע</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כתובת</span>
            <input className="field" value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">מחיר (₪)</span>
            <input className="field" type="number" dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">חדרים</span>
            <input className="field" type="number" step="0.5" dir="ltr" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">שטח (מ״ר)</span>
            <input className="field" type="number" dir="ltr" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">קומה</span>
            <input className="field" value={form.floor} maxLength={20} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">תג (למשל: חדש)</span>
            <input className="field" value={form.tag} maxLength={20} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">כתובת תמונה (URL)</span>
            <input className="field" dir="ltr" value={form.image_url} maxLength={500} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">תיאור</span>
            <textarea
              className="field min-h-24"
              value={form.description}
              maxLength={2000}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סדר הצגה</span>
            <input className="field" type="number" dir="ltr" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["has_mamad", "ממ״ד"],
              ["has_elevator", "מעלית"],
              ["has_parking", "חניה"],
              ["has_balcony", "מרפסת"],
              ["is_published", "מפורסם באתר"],
            ] as Array<[keyof ListingForm, string]>
          ).map(([key, label]) => (
            <label className="flex items-center gap-2 font-semibold" key={String(key)}>
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={submitListing}
            className="flex-1 rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
          >
            {form.id ? "עדכון הנכס" : "הוספת הנכס"}
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
      </section>
      )}

      {tab === "listings" && (
      <section className="soft-card mt-6 p-5">

        <h2 className="text-lg font-extrabold text-primary">הנכסים במסד הנתונים</h2>
        {listings.isLoading && <p className="mt-2 text-sm text-muted-foreground">טוען נכסים…</p>}
        <ul className="mt-3 grid gap-3">
          {(listings.data ?? []).map((l) => (
            <li key={l.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-primary">
                    {l.title} {!l.is_published && <span className="text-xs text-muted-foreground">(מוסתר)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.deal_type} · {l.neighborhood ?? "אין מידע"} · {formatListingPrice(l.price)}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button type="button" className="underline" onClick={() => setForm(toForm(l))}>
                    עריכה
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-destructive underline"
                    onClick={() => run(() => removeListing({ data: { id: l.id } }), "הנכס נמחק")}
                  >
                    מחיקה
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!listings.isLoading && (listings.data ?? []).length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">אין נכסים במסד הנתונים.</p>
        )}
      </section>
      )}

      {/* תוכן ופרטי העסק */}
      {tab === "content" && business && texts && (

        <section className="soft-card mt-6 p-5">
          <h2 className="text-lg font-extrabold text-primary">פרטי העסק וטקסטים</h2>
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

          <div className="mt-4 grid gap-3">
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
                () => saveContent({ data: { business: business as never, texts: texts as never } }),
                "התוכן נשמר",
              )
            }
            className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
          >
            שמירת התוכן
          </button>
        </section>
      )}
    </main>
  );
}
