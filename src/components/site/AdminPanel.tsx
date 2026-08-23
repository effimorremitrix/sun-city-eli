import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSite, saveSiteContent } from "@/lib/site.functions";
import {
  adminListListings,
  adminSaveListing,
  adminDeleteListing,
  adminBackfillListingCoords,
} from "@/lib/listings.functions";
import { adminMarkListingSold, type MarkListingSoldResult } from "@/lib/sold.functions";
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
import AdminLeads from "@/components/site/AdminLeads";
import AdminListingImages from "@/components/site/AdminListingImages";
import AdminImageField from "@/components/site/AdminImageField";
import AdminSitesPanel from "@/components/site/AdminSitesPanel";
import { AdminContentExtras } from "@/components/site/AdminContentExtras";
import AdminGuide, { TabHelp } from "@/components/site/AdminGuide";

export type AdminTabKey =
  | "listings"
  | "leads"
  | "sold"
  | "scout"
  | "content"
  | "publish"
  | "agents"
  | "clients"
  | "usage"
  | "guide";

type ListingForm = {
  id?: string;
  title: string;
  deal_type: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  lat: string;
  lng: string;
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
  lat: "",
  lng: "",
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
  lat: l.lat == null ? "" : String(l.lat),
  lng: l.lng == null ? "" : String(l.lng),
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
 * siteSlug — קישור ניהול ישיר (?site=slug) שבוחר מראש את הדף המנוהל.
 */
export function AdminPanel({ tab, siteSlug }: { tab: AdminTabKey; siteSlug?: string | null }) {
  const fetchSite = useServerFn(getAdminSite);
  const fetchListings = useServerFn(adminListListings);
  const saveContent = useServerFn(saveSiteContent);
  const saveListing = useServerFn(adminSaveListing);
  const removeListing = useServerFn(adminDeleteListing);
  const markListingSold = useServerFn(adminMarkListingSold);
  const backfillCoords = useServerFn(adminBackfillListingCoords);

  // ה-site הנבחר: אדמין יכול לעבור בין הסוכנים; סוכן רואה רק את שלו
  const [siteId, setSiteId] = useState<string | null>(null);

  const site = useQuery({
    queryKey: ["admin-site", siteId],
    queryFn: () => fetchSite({ data: { siteId } }),
  });

  // קישור ניהול ישיר: ?site=slug בוחר את הדף מראש — פעם אחת, כשהרשימה נטענת.
  // סוכן שקיבל קישור של דף שאינו שלו פשוט לא ימצא את ה-slug ברשימה המסוננת
  // שלו (RLS) — והדף שלו יישאר נבחר.
  const appliedSlugRef = useRef(false);
  useEffect(() => {
    if (appliedSlugRef.current || !siteSlug || !site.data?.sites) return;
    appliedSlugRef.current = true;
    const match = site.data.sites.find((s) => s.slug === siteSlug);
    if (match) setSiteId(match.id);
  }, [siteSlug, site.data]);
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
  const [coordsMsg, setCoordsMsg] = useState<string | null>(null);
  // פוסט "נמכר" מוכן להעתקה — תוצאת הסימון האחרון (הטקסט ניתן לעריכה לפני העתקה)
  const [soldPost, setSoldPost] = useState<MarkListingSoldResult | null>(null);
  const [soldPostCopied, setSoldPostCopied] = useState(false);

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

  // נכסים בלי קואורדינטות — שנשמרו לפני הוספת המפה או שהגיאוקוד פספס
  const withoutCoords = (listings.data ?? []).filter((l) => l.lat == null || l.lng == null).length;

  const runBackfill = () =>
    run(async () => {
      setCoordsMsg(null);
      // batches קטנים בלולאה: כל קריאת שרת קצרה מספיק כדי לא להיחתך בטיימאאוט,
      // וה-cursor ממשיך מעבר לכתובות שלא אותרו
      let after: string | null = null;
      let scanned = 0;
      let located = 0;
      let remaining = 0;
      for (let i = 0; i < 40; i++) {
        const res = (await backfillCoords({ data: { limit: 8, after } })) as {
          scanned: number;
          located: number;
          remaining: number;
          cursor: string | null;
        };
        scanned += res.scanned;
        located += res.located;
        remaining = res.remaining;
        after = res.cursor;
        setCoordsMsg(`נסרקו ${scanned} נכסים, אותרו ${located} מיקומים…`);
        if (!res.scanned || !res.cursor) break;
      }
      setCoordsMsg(
        `נסרקו ${scanned} נכסים, אותרו ${located} מיקומים.` +
          (remaining > 0
            ? ` ${remaining} נכסים נותרו ללא מיקום — אפשר לדייק את הכתובת או להזין קואורדינטות ידנית.`
            : ""),
      );
    }, "השלמת המיקומים הסתיימה");

  // השלמה אוטומטית בכניסה לטאב הנכסים — פעם אחת לסשן, כדי לא להפגיז את
  // Nominatim שוב ושוב בכתובות שממילא לא אותרו
  useEffect(() => {
    if (tab !== "listings" || !withoutCoords || busy) return;
    if (sessionStorage.getItem("coords-backfill-ran")) return;
    sessionStorage.setItem("coords-backfill-ran", "1");
    void runBackfill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, withoutCoords, busy]);

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
          lat: num(form.lat),
          lng: num(form.lng),
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
        waPending?: number;
        facebookPosted?: boolean;
      };
      setForm((f) => ({ ...f, id: res.id }));
      // waPending נספר רק על כשל אמיתי מול ספק הוואטסאפ (למשל תבנית שטרם
      // אושרה) — כך תקלת הגדרה מתגלה כבר בשמירה הראשונה ולא נשארת שקטה.
      const waFailed = res.waPending ? `, נכשלו: ${res.waPending}` : "";
      setMsg(
        `הנכס נשמר. אפשר להעלות עכשיו תמונות וסרטונים לנכס. נשלחו התראות ל-${res.matched} פרופילי חיפוש (מיילים: ${res.emailsSent}, וואטסאפ: ${res.waSent ?? 0}${waFailed}, ממתינים: ${res.emailsPending}).${res.facebookPosted ? " הנכס פורסם גם לעמוד הפייסבוק." : ""}`,
      );
    }, "הנכס נשמר");

  if (site.isLoading) {
    return <p className="mt-6 text-center text-muted-foreground">טוען…</p>;
  }

  // אין אתר מנוהל: אדמין תמיד עובר, ולסוכן הכוונה היא שהאתר שלו טרם הועבר לבעלותו.
  // מסך ריק כאן נראה בדיוק כמו תקלה ("אי אפשר להעלות לוגו"), ולכן מסבירים מה חסר.
  if (!isManager) {
    return (
      <p
        role="alert"
        className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive"
      >
        לא משויך אליך דף אישי, ולכן אי אפשר לערוך תוכן או להעלות קבצים. פנה למנהל המערכת כדי שישייך
        אותך דרך &quot;הוספת סוכן&quot; באזור הניהול.
      </p>
    );
  }

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

      {tab === "guide" && <AdminGuide isAdmin={site.data?.isAdmin === true} />}

      {tab === "agents" && isSuperAdmin && (
        <>
          <AdminSitesPanel sites={site.data?.sites ?? []} onChanged={() => void site.refetch()} />
          <AdminUsers audience="agents" />
        </>
      )}
      {tab === "clients" && isSuperAdmin && <AdminUsers audience="clients" />}
      {tab === "usage" && isSuperAdmin && <AdminUsage />}
      {tab === "scout" && isSuperAdmin && <AdminScout />}
      {tab === "leads" &&
        (selectedSiteId ? (
          <AdminLeads
            siteId={selectedSiteId}
            isSuperAdmin={isSuperAdmin}
            listings={listings.data ?? []}
            sites={site.data?.sites ?? []}
          />
        ) : (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
            לא נמצאה רשומת אתר במסד הנתונים — לא ניתן לנהל לידים.
          </p>
        ))}
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
            {/* מיקום למפה — מתמלא אוטומטית מהכתובת בשמירה. למלא ידנית רק כשהאיתור פספס. */}
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                קו רוחב למפה (lat) — ריק = איתור אוטומטי
              </span>
              <input
                className="field"
                type="number"
                step="any"
                dir="ltr"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                קו אורך למפה (lng) — ריק = איתור אוטומטי
              </span>
              <input
                className="field"
                type="number"
                step="any"
                dir="ltr"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
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

          {/* מיקום למפה: הנכסים שנשמרו לפני הוספת המפה עדיין בלי קואורדינטות */}
          {withoutCoords > 0 && (
            <div className="mt-3 rounded-xl border border-border p-3">
              <p className="text-sm text-muted-foreground">
                {withoutCoords} נכסים עדיין בלי מיקום ולכן אינם מוצגים על המפה באתר. ההשלמה מופעלת
                אוטומטית בכניסה לכאן; אפשר גם להפעיל ידנית.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={runBackfill}
                className="mt-2 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground disabled:opacity-60"
              >
                השלמת מיקומים
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                האיתור מתבצע מול OpenStreetMap בקצב של נכס אחד לשנייה, ולכן הפעולה עשויה להימשך כמה
                דקות כשיש הרבה נכסים.
              </p>
              {coordsMsg && <p className="mt-1 text-xs font-semibold text-primary">{coordsMsg}</p>}
            </div>
          )}

          {/* פוסט "נמכר" — מוצג אחרי סימון נכס כנמכר, מוכן להעתקה לאינסטגרם */}
          {soldPost && (
            <div className="mt-4 rounded-xl border-2 border-sun bg-secondary p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-primary">פוסט "נמכר" — מוכן להעתקה</h3>
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() => setSoldPost(null)}
                >
                  סגירה
                </button>
              </div>
              <p className="mt-1 text-xs font-semibold text-primary">
                {soldPost.instagram.posted
                  ? "הפוסט פורסם אוטומטית לאינסטגרם ✓"
                  : soldPost.instagram.attempted
                    ? `הפרסום האוטומטי לאינסטגרם נכשל (${soldPost.instagram.error ?? "שגיאה"}) — אפשר לפרסם ידנית עם הנוסח שלמטה`
                    : "אין חיבור אינסטגרם עסקי לדף — העתיקו את הנוסח ופרסמו ידנית (חיבור: טאב הפרסום)"}
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                {soldPost.post.imageUrl && (
                  <a href={soldPost.post.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={soldPost.post.imageUrl}
                      alt="תמונת הנכס שנמכר"
                      className="size-24 rounded-xl border-2 border-sun object-cover"
                    />
                  </a>
                )}
                <textarea
                  className="field min-h-32 flex-1"
                  value={soldPost.post.text}
                  onChange={(e) =>
                    setSoldPost({ ...soldPost, post: { ...soldPost.post, text: e.target.value } })
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
                  onClick={() => {
                    void navigator.clipboard.writeText(soldPost.post.text);
                    setSoldPostCopied(true);
                    window.setTimeout(() => setSoldPostCopied(false), 2000);
                  }}
                >
                  {soldPostCopied ? "הועתק ✓" : "העתקת הנוסח"}
                </button>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
                >
                  פתיחת אינסטגרם
                </a>
              </div>
            </div>
          )}

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
                    {l.is_published && (
                      <button
                        type="button"
                        disabled={busy}
                        className="font-bold text-sun underline"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `לסמן את "${l.title}" כנמכר? הנכס יוסתר מהאתר ויתווסף למדור "נמכר על ידינו".`,
                            )
                          )
                            return;
                          void run(async () => {
                            const res = (await markListingSold({
                              data: { listingId: l.id },
                            })) as MarkListingSoldResult;
                            setSoldPost(res);
                            setSoldPostCopied(false);
                          }, 'הנכס סומן כנמכר ונוסף למדור "נמכר על ידינו"');
                        }}
                      >
                        סימון כנמכר
                      </button>
                    )}
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

          {/* לוגו האתר — מחליף את הלוגו המובנה בהדר, בפוטר ובסליידר */}
          <h3 className="mt-6 text-base font-extrabold text-primary">לוגו האתר</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            שדה ריק — האתר משתמש בלוגו המובנה שלו.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <AdminImageField
              label="לוגו מלא (בסליידר בראש הדף)"
              folder="logos"
              allowSvg
              value={business.logoUrl ?? ""}
              onChange={(url) => setBusiness({ ...business, logoUrl: url })}
            />
            <AdminImageField
              label="סמל מרובע (הדר ופוטר)"
              folder="logos"
              allowSvg
              value={business.logoIconUrl ?? ""}
              onChange={(url) => setBusiness({ ...business, logoIconUrl: url })}
            />
          </div>

          {/* תמונות וסרטוני הסליידר בראש הדף */}
          <h3 className="mt-6 text-base font-extrabold text-primary">
            תמונות וסרטונים בסליידר בראש הדף
          </h3>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              כתובת תמונה או סרטון (mp4/webm) אחת בכל שורה. שדה ריק — תמונות ברירת המחדל של האתר.
            </span>
            <textarea
              className="field min-h-24"
              dir="ltr"
              placeholder={"https://…/hero-1.jpg\nhttps://…/hero-video.mp4"}
              value={(business.heroImages ?? []).join("\n")}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  heroImages: e.target.value
                    .split("\n")
                    .map((u) => u.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <div className="mt-3">
            <AdminImageField
              label="הוספת תמונה או סרטון לסליידר"
              folder="hero"
              allowVideo
              value=""
              onChange={(url) =>
                url &&
                setBusiness({ ...business, heroImages: [...(business.heroImages ?? []), url] })
              }
              hint="כל העלאה מוסיפה שורה לרשימה שלמעלה. סרטון: עד 50MB, מומלץ קצר — הוא מוצג מושתק ובלולאה."
            />
          </div>

          {/* חוות דעת — המספר והדירוג המוצגים בסקשן "למה סאן סיטי", מקושרים למקור */}
          <h3 className="mt-6 text-base font-extrabold text-primary">חוות דעת מלקוחות</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            המספר והדירוג מוצגים כתגיות בסקשן "למה סאן סיטי" ומקושרים לעמוד חוות הדעת. שדה ריק —
            התגייה לא מוצגת כלל.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                קישור לחוות הדעת בגוגל
              </span>
              <input
                className="field"
                dir="ltr"
                placeholder="https://www.google.com/maps/..."
                value={business.reviewsUrl ?? ""}
                onChange={(e) => setBusiness({ ...business, reviewsUrl: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                מספר חוות דעת
              </span>
              <input
                className="field"
                type="number"
                min={0}
                dir="ltr"
                value={business.reviewsCount ?? ""}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    reviewsCount: e.target.value.trim() === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                דירוג ממוצע (0–5)
              </span>
              <input
                className="field"
                type="number"
                min={0}
                max={5}
                step="0.1"
                dir="ltr"
                value={business.reviewsRating ?? ""}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    reviewsRating: e.target.value.trim() === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
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
            <div className="sm:col-span-2">
              <AdminImageField
                label="תמונת הסוכן"
                folder="agents"
                hint="מוצגת בדף האישי של הסוכן, בקרוסלת הצוות ובכרטיסי הנכסים שלו."
                value={business.photoUrl ?? ""}
                onChange={(url) => setBusiness({ ...business, photoUrl: url })}
              />
            </div>
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
                ["facebook", "קישור פייסבוק", "https://www.facebook.com/..."],
                ["instagram", "קישור אינסטגרם", "https://www.instagram.com/..."],
                ["tiktok", "קישור טיקטוק", "https://www.tiktok.com/..."],
                [
                  "whatsappGroup",
                  "קישור קבוצת קונים בוואטסאפ (ריק — פנייה לוואטסאפ האישי)",
                  "https://chat.whatsapp.com/...",
                ],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label className="block" key={key}>
                <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
                <input
                  className="field"
                  dir="ltr"
                  placeholder={placeholder}
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
