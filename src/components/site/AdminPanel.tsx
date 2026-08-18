import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSite, saveSiteContent } from "@/lib/site.functions";
import { adminListListings, adminSaveListing, adminDeleteListing } from "@/lib/listings.functions";
import { formatListingPrice, type Listing } from "@/lib/listings";
import { neighborhoods } from "@/lib/site-data";
import type {
  LiveBusiness,
  LiveContentTranslation,
  LiveTexts,
  LiveTranslations,
} from "@/lib/site-live";
import { AdminTranslateTabs, type FlatTranslations } from "@/components/site/AdminTranslateTabs";
import { AdminUsers } from "@/components/site/AdminUsers";
import { AdminPublish } from "@/components/site/AdminPublish";
import { AdminSold } from "@/components/site/AdminSold";
import AdminUsage from "@/components/site/AdminUsage";
import AdminScout from "@/components/site/AdminScout";
import AdminListingImages from "@/components/site/AdminListingImages";
import { AdminContentExtras } from "@/components/site/AdminContentExtras";
import { TabHelp } from "@/components/site/AdminGuide";

export type AdminTabKey = "listings" | "sold" | "scout" | "content" | "publish" | "users" | "usage";

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
  has_storage: boolean;
  storage_count: string;
  parking_count: string;
  tag: string;
  image_url: string;
  is_published: boolean;
  sort_order: string;
  translations: FlatTranslations;
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
  has_storage: false,
  storage_count: "",
  parking_count: "",
  tag: "",
  image_url: "",
  is_published: true,
  sort_order: "0",
  translations: {},
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
  has_storage: l.has_storage ?? false,
  storage_count: l.storage_count == null ? "" : String(l.storage_count),
  parking_count: l.parking_count == null ? "" : String(l.parking_count),
  tag: l.tag ?? "",
  image_url: l.image_url ?? "",
  is_published: l.is_published,
  sort_order: String(l.sort_order),
  translations: Object.fromEntries(
    Object.entries(l.translations ?? {}).map(([locale, tr]) => [
      locale,
      { title: tr?.title ?? "", description: tr?.description ?? "" },
    ]),
  ),
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const str = (v: string) => (v.trim() === "" ? null : v.trim());

/* -------- המרות בין מבנה התרגומים השטוח בעורך למבנה הנשמר במסד -------- */

/** תרגומי נכס: משאיר רק שדות שמולאו בפועל */
const listingTranslations = (flat: FlatTranslations) => {
  const out: Record<string, { title?: string; description?: string }> = {};
  for (const [locale, f] of Object.entries(flat)) {
    const entry: { title?: string; description?: string } = {};
    if (f["title"]?.trim()) entry.title = f["title"].trim();
    if (f["description"]?.trim()) entry.description = f["description"].trim();
    if (Object.keys(entry).length) out[locale] = entry;
  }
  return out;
};

const CONTENT_BUSINESS_KEYS = ["name", "tagline", "subtitle", "address"] as const;
const CONTENT_TEXT_KEYS = ["heroTitle", "heroSubtitle"] as const;

/** תרגומי תוכן העסק: מהמבנה המקונן במסד למבנה שטוח לעורך */
const flattenContentTranslations = (tr: LiveTranslations | undefined): FlatTranslations => {
  const out: FlatTranslations = {};
  for (const [locale, c] of Object.entries(tr ?? {})) {
    if (!c) continue;
    const flat: Record<string, string> = {};
    for (const k of CONTENT_BUSINESS_KEYS) {
      const v = c.business?.[k];
      if (v) flat[k] = v;
    }
    for (const k of CONTENT_TEXT_KEYS) {
      const v = c.texts?.[k];
      if (v) flat[k] = v;
    }
    if (Object.keys(flat).length) out[locale] = flat;
  }
  return out;
};

/** תרגומי תוכן העסק: מהעורך השטוח חזרה למבנה הנשמר במסד */
const nestContentTranslations = (flat: FlatTranslations): LiveTranslations => {
  const out: LiveTranslations = {};
  for (const [locale, f] of Object.entries(flat)) {
    const entry: LiveContentTranslation = {};
    for (const k of CONTENT_BUSINESS_KEYS) {
      const v = f[k]?.trim();
      if (v) entry.business = { ...(entry.business ?? {}), [k]: v };
    }
    for (const k of CONTENT_TEXT_KEYS) {
      const v = f[k]?.trim();
      if (v) entry.texts = { ...(entry.texts ?? {}), [k]: v };
    }
    if (Object.keys(entry).length) out[locale] = entry;
  }
  return out;
};

/**
 * לוח הניהול המלא — מוצג בתוך האזור האישי (טאבי ניהול מאוחדים).
 * מקבל את הטאב הפעיל; בורר האתרים וההודעות משותפים לכל הטאבים.
 */
export function AdminPanel({ tab }: { tab: AdminTabKey }) {
  const fetchSite = useServerFn(getAdminSite);
  const fetchListings = useServerFn(adminListListings);
  const saveContent = useServerFn(saveSiteContent);
  const saveListing = useServerFn(adminSaveListing);
  const removeListing = useServerFn(adminDeleteListing);

  // ה-site הנבחר: אדמין יכול לעבור בין הסוכנים; סוכן רואה רק את שלו
  const [siteId, setSiteId] = useState<string | null>(null);

  const site = useQuery({
    queryKey: ["admin-site", siteId],
    queryFn: () => fetchSite({ data: { siteId } }),
  });
  const isManager = site.data?.isAdmin === true || site.data?.isAgent === true;
  const isSuperAdmin = site.data?.isSuperAdmin === true;
  const selectedSiteId = site.data?.site?.id ?? null;
  const listings = useQuery({
    queryKey: ["admin-listings", selectedSiteId],
    queryFn: () => fetchListings({ data: { siteId: selectedSiteId } }),
    enabled: isManager && selectedSiteId != null,
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<ListingForm>(emptyForm);

  const [business, setBusiness] = useState<LiveBusiness | null>(null);
  const [texts, setTexts] = useState<LiveTexts | null>(null);
  const [contentTr, setContentTr] = useState<FlatTranslations>({});
  useEffect(() => {
    if (site.data?.live) {
      setBusiness(site.data.live.business);
      setTexts(site.data.live.texts);
      setContentTr(flattenContentTranslations(site.data.live.translations));
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
          site_id: selectedSiteId,
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
          has_storage: form.has_storage,
          storage_count: num(form.storage_count),
          parking_count: num(form.parking_count),
          tag: str(form.tag),
          image_url: str(form.image_url),
          image_key: null,
          is_published: form.is_published,
          sort_order: Number(form.sort_order) || 0,
          translations: listingTranslations(form.translations),
        },
      })) as {
        id: string;
        matched: number;
        emailsSent: number;
        emailsPending: number;
        waSent?: number;
        facebookPosted?: boolean;
      };
      setForm((f) => ({ ...f, id: res.id }));
      setMsg(
        `הנכס נשמר. אפשר להעלות עכשיו תמונות וסרטונים לנכס. נשלחו התראות ל-${res.matched} פרופילי חיפוש (מיילים: ${res.emailsSent}, וואטסאפ: ${res.waSent ?? 0}, ממתינים: ${res.emailsPending}).${res.facebookPosted ? " הנכס פורסם גם לעמוד הפייסבוק." : ""}`,
      );
    }, "הנכס נשמר");

  if (site.isLoading) {
    return <p className="mt-6 text-center text-muted-foreground">טוען…</p>;
  }

  if (!isManager) return null;

  return (
    <div>
      {msg && (
        <p className="mt-4 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>
      )}
      {err && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {/* בורר אתר/סוכן — לאדמין שמנהל כמה דפים */}
      {(site.data?.sites ?? []).length > 1 && (
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            אני צופה כ־ (הדף המנוהל)
          </span>
          <select
            className="field"
            value={selectedSiteId ?? ""}
            onChange={(e) => setSiteId(e.target.value || null)}
          >
            {(site.data?.sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — /{s.slug}
                {s.is_active ? "" : " (מושבת)"}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* המדריך הרלוונטי לטאב הנוכחי */}
      <TabHelp tab={tab} isAdmin={site.data?.isAdmin === true} />

      {tab === "users" && isSuperAdmin && <AdminUsers />}
      {tab === "usage" && isSuperAdmin && <AdminUsage />}
      {tab === "scout" && isSuperAdmin && <AdminScout />}
      {tab === "sold" &&
        (selectedSiteId ? (
          <AdminSold siteId={selectedSiteId} />
        ) : (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
            לא נמצאה רשומת אתר במסד הנתונים — לא ניתן לנהל את מדור הנמכרים.
          </p>
        ))}
      {tab === "publish" &&
        (selectedSiteId ? (
          <AdminPublish siteId={selectedSiteId} listings={listings.data ?? []} />
        ) : (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
            לא נמצאה רשומת אתר במסד הנתונים — לא ניתן לנהל את הפרסום.
          </p>
        ))}

      {/* ניהול נכסים */}
      {tab === "listings" && (
        <section className="soft-card mt-6 p-5">
          <h2 className="text-lg font-extrabold text-primary">
            {form.id ? "עריכת נכס" : "הוספת נכס"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            כל נכס שמפורסם מייצר התראה אוטומטית לכל לקוח שהפרופיל שלו תואם. אין להזין נכס שאינו
            אמיתי.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">כותרת הנכס</span>
              <input
                className="field"
                value={form.title}
                maxLength={200}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">סוג עסקה</span>
              <select
                className="field"
                value={form.deal_type}
                onChange={(e) => setForm({ ...form, deal_type: e.target.value })}
              >
                <option value="מכירה">מכירה</option>
                <option value="השכרה">השכרה</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">שכונה</span>
              <select
                className="field"
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              >
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
              <input
                className="field"
                value={form.address}
                maxLength={200}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">מחיר (₪)</span>
              <input
                className="field"
                type="number"
                dir="ltr"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">חדרים</span>
              <input
                className="field"
                type="number"
                step="0.5"
                dir="ltr"
                value={form.rooms}
                onChange={(e) => setForm({ ...form, rooms: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">שטח (מ״ר)</span>
              <input
                className="field"
                type="number"
                dir="ltr"
                value={form.size_sqm}
                onChange={(e) => setForm({ ...form, size_sqm: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">קומה</span>
              <input
                className="field"
                value={form.floor}
                maxLength={20}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">מספר חניות</span>
              <input
                className="field"
                type="number"
                min="0"
                dir="ltr"
                value={form.parking_count}
                onChange={(e) => setForm({ ...form, parking_count: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                מספר מחסנים
              </span>
              <input
                className="field"
                type="number"
                min="0"
                dir="ltr"
                value={form.storage_count}
                onChange={(e) => setForm({ ...form, storage_count: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                תג (למשל: חדש)
              </span>
              <input
                className="field"
                value={form.tag}
                maxLength={20}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
              />
            </label>
            <div className="sm:col-span-2">
              <AdminListingImages
                listingId={form.id ?? null}
                onChanged={() => void listings.refetch()}
              />
            </div>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                כתובת תמונה חיצונית (URL) — אופציונלי, בשימוש כשאין תמונות שהועלו
              </span>
              <input
                className="field"
                dir="ltr"
                value={form.image_url}
                maxLength={500}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
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
              <input
                className="field"
                type="number"
                dir="ltr"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </label>
          </div>

          <AdminTranslateTabs
            title="תרגומי הנכס (כותרת ותיאור)"
            fields={[
              { key: "title", label: "כותרת הנכס", source: form.title },
              { key: "description", label: "תיאור", source: form.description, multiline: true },
            ]}
            value={form.translations}
            onChange={(translations) => setForm({ ...form, translations })}
            disabled={busy}
          />

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {(
              [
                ["has_mamad", "ממ״ד"],
                ["has_elevator", "מעלית"],
                ["has_parking", "חניה"],
                ["has_balcony", "מרפסת"],
                ["has_storage", "מחסן"],
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
                      {l.title}{" "}
                      {!l.is_published && (
                        <span className="text-xs text-muted-foreground">(מוסתר)</span>
                      )}
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

          {/* פרופיל הסוכן של הדף: שם, תפקיד, תמונה, אודות ורשתות חברתיות */}
          <h3 className="mt-6 text-base font-extrabold text-primary">פרופיל הסוכן של הדף</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            הפרטים האלה מוצגים בדף האישי של הסוכן; קישורי הרשתות מוצגים צבעוניים בראש הדף.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["agentName", "שם הסוכן"],
                ["roleTitle", "תפקיד"],
                ["photoUrl", "כתובת תמונת הסוכן (URL)"],
              ] as Array<[keyof LiveBusiness, string]>
            ).map(([key, label]) => (
              <label className="block" key={String(key)}>
                <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
                <input
                  className="field"
                  dir={key === "photoUrl" ? "ltr" : undefined}
                  value={String(business[key] ?? "")}
                  onChange={(e) => setBusiness({ ...business, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                כמה מילים על הסוכן (אודות)
              </span>
              <textarea
                className="field min-h-20"
                value={business.bio ?? ""}
                maxLength={600}
                onChange={(e) => setBusiness({ ...business, bio: e.target.value })}
              />
            </label>
            {(
              [
                ["facebook", "קישור פייסבוק"],
                ["instagram", "קישור אינסטגרם"],
                ["tiktok", "קישור טיקטוק"],
              ] as const
            ).map(([key, label]) => (
              <label className="block" key={key}>
                <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
                <input
                  className="field"
                  dir="ltr"
                  placeholder={`https://www.${key}.com/...`}
                  value={business.social?.[key] ?? ""}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      social: { ...(business.social ?? {}), [key]: e.target.value } as never,
                    })
                  }
                />
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                כותרת ראשית
              </span>
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

          <AdminTranslateTabs
            title="תרגומי התוכן (שם, סלוגן, כתובת וכותרות)"
            fields={[
              { key: "name", label: "שם העסק", source: business.name },
              { key: "tagline", label: "סלוגן", source: business.tagline },
              { key: "subtitle", label: "תת־כותרת", source: business.subtitle },
              { key: "address", label: "כתובת", source: business.address },
              { key: "heroTitle", label: "כותרת ראשית", source: texts.heroTitle },
              {
                key: "heroSubtitle",
                label: "כותרת משנה",
                source: texts.heroSubtitle,
                multiline: true,
              },
            ]}
            value={contentTr}
            onChange={setContentTr}
            disabled={busy}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  saveContent({
                    data: {
                      siteId: selectedSiteId,
                      business: business as never,
                      texts: texts as never,
                      translations: nestContentTranslations(contentTr) as never,
                    },
                  }),
                "התוכן נשמר",
              )
            }
            className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
          >
            שמירת התוכן
          </button>
        </section>
      )}

      {/* ממליצים ושאלות נפוצות — נשמרים בנפרד מהטופס הראשי */}
      {tab === "content" && selectedSiteId && (
        <AdminContentExtras
          siteId={selectedSiteId}
          testimonials={site.data?.live?.testimonials ?? null}
          faq={site.data?.live?.faq ?? null}
          onSaved={() => void site.refetch()}
        />
      )}
    </div>
  );
}
