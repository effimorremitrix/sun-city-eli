import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Sparkles, LogOut, User } from "lucide-react";
import {
  getMyAccount,
  saveMySearchProfile,
  deleteMySearchProfile,
  markNotificationRead,
  updateMyProfile,
  type SearchProfileRow,
} from "@/lib/account.functions";
import { claimAdminRole } from "@/lib/site.functions";
import { adminScoutNewCount } from "@/lib/scout.functions";
import { respondToNotification } from "@/lib/leads.functions";
import { CLIENT_RESPONSES, type ClientResponse } from "@/lib/leads";
import { formatListingPrice } from "@/lib/listings";
import { neighborhoods } from "@/lib/site-data";
import { formatUpdated } from "@/lib/site-live";
import { useAuth } from "@/hooks/useAuth";
import AccountSettings from "@/components/site/AccountSettings";
import { AdminPanel, type AdminTabKey } from "@/components/site/AdminPanel";

const title = 'האזור האישי | סאן סיטי נדל"ן';
const description =
  "האזור האישי שלכם: הגדרת סוכן אישי, פרופיל חיפוש דירה בנתניה והתראות על נכסים חדשים.";

type TabKey = "overview" | AdminTabKey;

const TAB_KEYS: TabKey[] = [
  "overview",
  "listings",
  "sold",
  "scout",
  "content",
  "publish",
  "agents",
  "clients",
  "usage",
];

/** slug של דף מנוהל — לקישור ניהול ישיר (?site=slug) של המנהל הראשי */
const SITE_PARAM_RE = /^[a-z0-9-]{1,60}$/;

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabKey; site?: string } => {
    const tab = search["tab"];
    const site = search["site"];
    return {
      ...(TAB_KEYS.includes(tab as TabKey) ? { tab: tab as TabKey } : {}),
      ...(typeof site === "string" && SITE_PARAM_RE.test(site) ? { site } : {}),
    };
  },
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
  component: AccountPage,
});

type ProfileForm = {
  id?: string;
  label: string;
  deal_type: string;
  city: string;
  neighborhoods: string[];
  street: string;
  min_price: string;
  max_price: string;
  min_rooms: string;
  rooms: string;
  max_rooms: string;
  min_size: string;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  notes: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
  whatsapp_phone: string;
  is_active: boolean;
};

const emptyProfile: ProfileForm = {
  label: "החיפוש שלי",
  deal_type: "מכירה",
  city: "נתניה",
  neighborhoods: [],
  street: "",
  min_price: "",
  max_price: "",
  min_rooms: "",
  rooms: "",
  max_rooms: "",
  min_size: "",
  needs_mamad: false,
  needs_elevator: false,
  needs_parking: false,
  needs_balcony: false,
  notes: "",
  notify_email: true,
  notify_whatsapp: false,
  whatsapp_phone: "",
  is_active: true,
};

const toForm = (p: SearchProfileRow): ProfileForm => ({
  id: p.id,
  label: p.label,
  deal_type: p.deal_type,
  city: p.city,
  neighborhoods: p.neighborhoods ?? [],
  street: p.street ?? "",
  min_price: p.min_price == null ? "" : String(p.min_price),
  max_price: p.max_price == null ? "" : String(p.max_price),
  min_rooms: p.min_rooms == null ? "" : String(p.min_rooms),
  rooms: p.rooms == null ? "" : String(p.rooms),
  max_rooms: p.max_rooms == null ? "" : String(p.max_rooms),
  min_size: p.min_size == null ? "" : String(p.min_size),
  needs_mamad: p.needs_mamad,
  needs_elevator: p.needs_elevator,
  needs_parking: p.needs_parking,
  needs_balcony: p.needs_balcony,
  notes: p.notes ?? "",
  notify_email: p.notify_email,
  notify_whatsapp: p.notify_whatsapp ?? false,
  whatsapp_phone: p.whatsapp_phone ?? "",
  is_active: p.is_active,
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function AccountPage() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const fetchAccount = useServerFn(getMyAccount);
  const saveProfile = useServerFn(saveMySearchProfile);
  const removeProfile = useServerFn(deleteMySearchProfile);
  const markRead = useServerFn(markNotificationRead);
  const respond = useServerFn(respondToNotification);
  const updateProfile = useServerFn(updateMyProfile);
  const claim = useServerFn(claimAdminRole);
  const fetchScoutCount = useServerFn(adminScoutNewCount);

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);

  const isAdmin = account.data?.isAdmin === true;
  const isSuperAdmin = account.data?.isSuperAdmin === true;
  const isManager = isAdmin || account.data?.isAgent === true;

  const tab: TabKey = isManager ? (search.tab ?? "overview") : "overview";
  // מעבר בין טאבים משמר את ?site= — כדי שקישור ניהול ישיר ימשיך להצביע על הדף הנבחר
  const setTab = (next: TabKey) =>
    void navigate({
      to: "/account",
      search: {
        ...(next === "overview" ? {} : { tab: next }),
        ...(search.site ? { site: search.site } : {}),
      },
      replace: true,
    });

  const scoutCount = useQuery({
    queryKey: ["scout-new-count"],
    queryFn: () => fetchScoutCount(),
    enabled: isSuperAdmin,
  });
  const newCount = scoutCount.data?.count ?? 0;

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await account.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const toggleHood = (n: string) =>
    setForm({
      ...form,
      neighborhoods: form.neighborhoods.includes(n)
        ? form.neighborhoods.filter((x) => x !== n)
        : [...form.neighborhoods, n],
    });

  const submit = () =>
    run(async () => {
      await saveProfile({
        data: {
          ...(form.id ? { id: form.id } : {}),
          label: form.label,
          deal_type: form.deal_type,
          city: form.city || "נתניה",
          neighborhoods: form.neighborhoods,
          street: form.street.trim() === "" ? null : form.street.trim(),
          min_price: num(form.min_price),
          max_price: num(form.max_price),
          min_rooms: num(form.min_rooms),
          rooms: num(form.rooms),
          max_rooms: num(form.max_rooms),
          min_size: num(form.min_size),
          needs_mamad: form.needs_mamad,
          needs_elevator: form.needs_elevator,
          needs_parking: form.needs_parking,
          needs_balcony: form.needs_balcony,
          notes: form.notes.trim() === "" ? null : form.notes.trim(),
          notify_email: form.notify_email,
          notify_whatsapp: form.notify_whatsapp,
          whatsapp_phone: form.whatsapp_phone.trim() === "" ? null : form.whatsapp_phone.trim(),
          is_active: form.is_active,
        },
      });
      setForm(emptyProfile);
    }, "פרופיל החיפוש נשמר. מעכשיו נעדכן אותך על כל נכס חדש שמתאים.");

  const notifications = account.data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">
            {isManager
              ? "האזור האישי ואזור הניהול"
              : user?.fullName
                ? `שלום, ${user.fullName}`
                : "האזור האישי שלי"}
          </h1>
          {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="underline">
            לאתר
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 font-bold text-destructive underline"
          >
            <LogOut className="size-4" aria-hidden="true" />
            יציאה
          </button>
        </div>
      </div>

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

      {/* טאבים מאוחדים — האזור האישי + כל טאבי הניהול (למנהל ולסוכנים) */}
      {isManager && (
        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {(
            [
              ["overview", "החשבון שלי"],
              ["listings", "נכסים"],
              ["sold", "נמכרו"],
              ...(isSuperAdmin
                ? ([["scout", newCount > 0 ? `סוכן סריקה (${newCount})` : "סוכן סריקה"]] as Array<
                    [TabKey, string]
                  >)
                : []),
              ["content", "תוכן העסק"],
              ["publish", "פרסום"],
              ...(isSuperAdmin
                ? ([
                    ["agents", "סוכנים וצוות"],
                    ["clients", "לקוחות רשומים"],
                    ["usage", "שימוש (Usage)"],
                  ] as Array<[TabKey, string]>)
                : []),
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
      )}

      {/* טאבי הניהול — הלוח המלא */}
      {isManager && tab !== "overview" && <AdminPanel tab={tab} siteSlug={search.site ?? null} />}

      {tab === "overview" && (
        <>
          {/* פרטי פרופיל */}
          <section className="soft-card mt-6 p-5">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
              <User className="size-5 text-sun" aria-hidden="true" />
              פרטי פרופיל
            </h2>
            {editingName ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block flex-1 min-w-[12rem]">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">שם מלא</span>
                  <input
                    className="field"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await updateProfile({ data: { full_name: nameInput.trim() } });
                        refresh();
                        setEditingName(false);
                      }, "השם עודכן")
                    }
                    className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground disabled:opacity-60"
                  >
                    שמירה
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(user?.fullName ?? "");
                      setEditingName(false);
                    }}
                    className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-foreground">
                  <span className="font-bold">שם:</span> {user?.fullName?.trim() || "לא הוגדר"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(user?.fullName ?? "");
                    setEditingName(true);
                  }}
                  className="text-sm font-semibold text-primary underline"
                >
                  עריכת שם
                </button>
              </div>
            )}
          </section>

          {isSuperAdmin && (
            <section className="soft-card mt-6 p-5">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                <Sparkles className="size-5 text-sun" aria-hidden="true" />
                הסוכן שלך נמצא בטאב "סוכן סריקה"
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                הסוכן האישי וההתראות באזור זה נבנו עבור לקוחות המשרד. הסוכן שלך סורק את האינטרנט
                ומציע נכסים להעלאה לאתר — הוא נמצא בטאב "סוכן סריקה" למעלה.
              </p>
              <button
                type="button"
                onClick={() => setTab("scout")}
                className="mt-4 inline-flex rounded-xl bg-sun px-5 py-3 text-sm font-bold text-sun-foreground"
              >
                מעבר לסוכן הסריקה
              </button>
            </section>
          )}

          {!isAdmin && (
            <>
              {/* התראות */}
              <section className="soft-card mt-6 p-5">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                  <BellRing className="size-5 text-sun" aria-hidden="true" />
                  התראות על נכסים חדשים{" "}
                  {unread > 0 && <span className="text-sm text-sun">({unread} חדשות)</span>}
                </h2>
                {account.isLoading && <p className="mt-2 text-sm text-muted-foreground">טוען…</p>}
                {!account.isLoading && notifications.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    אין התראות עדיין. ברגע שהמשרד יפרסם נכס שתואם לפרופיל שלכם — הוא יופיע כאן
                    ויישלח גם במייל.
                  </p>
                )}
                <ul className="mt-3 grid gap-3">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`rounded-xl border p-3 ${n.read_at ? "border-border" : "border-sun bg-secondary/60"}`}
                    >
                      <p className="font-bold text-primary">{n.listing?.title ?? "נכס הוסר"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.listing?.neighborhood ?? "אין מידע"} ·{" "}
                        {formatListingPrice(n.listing?.price ?? null)} ·{" "}
                        {formatUpdated(n.created_at)}
                      </p>
                      {n.reason && <p className="mt-1 text-xs text-muted-foreground">{n.reason}</p>}
                      {/* תגובה מהירה — יוצרת משימת Follow-up אצל הסוכן המטפל */}
                      {n.response ? (
                        <p className="mt-2 rounded-lg bg-secondary p-2 text-xs font-semibold text-primary">
                          קיבלנו את התגובה שלך (
                          {CLIENT_RESPONSES[n.response as ClientResponse] ?? n.response}) — הסוכן
                          יחזור אליך בהקדם.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(
                            Object.entries(CLIENT_RESPONSES) as Array<[ClientResponse, string]>
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              disabled={busy}
                              className="rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
                              onClick={() =>
                                run(
                                  () => respond({ data: { notificationId: n.id, response: key } }),
                                  "קיבלנו! הסוכן יחזור אליך בהקדם.",
                                )
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex gap-3 text-sm">
                        <Link to="/" hash="properties" className="underline">
                          לצפייה באתר
                        </Link>
                        {!n.read_at && (
                          <button
                            type="button"
                            disabled={busy}
                            className="underline"
                            onClick={() =>
                              run(() => markRead({ data: { id: n.id } }), "סומן כנקרא")
                            }
                          >
                            סימון כנקרא
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* פרופילי חיפוש */}
              <section className="soft-card mt-6 p-5">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                  <Sparkles className="size-5 text-sun" aria-hidden="true" />
                  הסוכן האישי שלי
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  הגדירו את פרופיל הנכס שאתם מחפשים. בכל פעם שהמשרד יפרסם נכס תואם — תקבלו התראה
                  כאן, במייל ואם תבחרו גם בוואטסאפ.
                </p>

                <ul className="mt-4 grid gap-3">
                  {(account.data?.profiles ?? []).map((p) => (
                    <li key={p.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-primary">
                            {p.label}{" "}
                            {!p.is_active && (
                              <span className="text-xs text-muted-foreground">(כבוי)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.deal_type} ·{" "}
                            {p.neighborhoods?.length ? p.neighborhoods.join(", ") : "כל האזורים"} ·{" "}
                            {p.max_price
                              ? `עד ${p.max_price.toLocaleString("he-IL")} ₪`
                              : "בלי הגבלת מחיר"}{" "}
                            ·{" "}
                            {p.rooms
                              ? `${p.rooms} חדרים`
                              : p.min_rooms
                                ? `${p.min_rooms}+ חדרים`
                                : "כל מספר חדרים"}
                            {p.street ? ` · רחוב ${p.street}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <button
                            type="button"
                            className="underline"
                            onClick={() => setForm(toForm(p))}
                          >
                            עריכה
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-destructive underline"
                            onClick={() =>
                              run(() => removeProfile({ data: { id: p.id } }), "הפרופיל נמחק")
                            }
                          >
                            מחיקה
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-5 text-sm font-extrabold text-primary">
                  {form.id ? "עריכת פרופיל חיפוש" : "פרופיל חיפוש חדש"}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      שם הפרופיל
                    </span>
                    <input
                      className="field"
                      value={form.label}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      סוג עסקה
                    </span>
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
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">עיר</span>
                    <input
                      className="field"
                      value={form.city}
                      maxLength={60}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      רחוב (אופציונלי)
                    </span>
                    <input
                      className="field"
                      value={form.street}
                      maxLength={80}
                      placeholder="למשל: גולדה מאיר"
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      חדרים (מדויק, ±חצי חדר)
                    </span>
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
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      מחיר מינימלי (₪)
                    </span>
                    <input
                      className="field"
                      type="number"
                      dir="ltr"
                      value={form.min_price}
                      onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      מחיר מקסימלי (₪)
                    </span>
                    <input
                      className="field"
                      type="number"
                      dir="ltr"
                      value={form.max_price}
                      onChange={(e) => setForm({ ...form, max_price: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      חדרים (מינימום)
                    </span>
                    <input
                      className="field"
                      type="number"
                      step="0.5"
                      dir="ltr"
                      value={form.min_rooms}
                      onChange={(e) => setForm({ ...form, min_rooms: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      חדרים (מקסימום)
                    </span>
                    <input
                      className="field"
                      type="number"
                      step="0.5"
                      dir="ltr"
                      value={form.max_rooms}
                      onChange={(e) => setForm({ ...form, max_rooms: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      שטח מינימלי (מ״ר)
                    </span>
                    <input
                      className="field"
                      type="number"
                      dir="ltr"
                      value={form.min_size}
                      onChange={(e) => setForm({ ...form, min_size: e.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      הערות לסוכן
                    </span>
                    <textarea
                      className="field min-h-20"
                      value={form.notes}
                      maxLength={500}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </label>
                </div>

                <fieldset className="mt-4">
                  <legend className="mb-2 text-xs font-bold text-muted-foreground">
                    אזורים בעיר (אפשר לבחור כמה)
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {neighborhoods.map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => toggleHood(n)}
                        aria-pressed={form.neighborhoods.includes(n)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          form.neighborhoods.includes(n)
                            ? "border-sun bg-sun text-sun-foreground"
                            : "border-border text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {(
                    [
                      ["needs_mamad", "ממ״ד"],
                      ["needs_elevator", "מעלית"],
                      ["needs_parking", "חניה"],
                      ["needs_balcony", "מרפסת"],
                      ["notify_email", "לקבל התראות במייל"],
                      ["notify_whatsapp", "לקבל התראות בוואטסאפ"],
                      ["is_active", "פרופיל פעיל"],
                    ] as Array<[keyof ProfileForm, string]>
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

                {form.notify_whatsapp && (
                  <label className="mt-3 block max-w-xs">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      מספר וואטסאפ להתראות
                    </span>
                    <input
                      className="field"
                      dir="ltr"
                      value={form.whatsapp_phone}
                      maxLength={20}
                      placeholder="050-1234567"
                      onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
                    />
                  </label>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={submit}
                    className="flex-1 rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
                  >
                    {form.id ? "עדכון הפרופיל" : "הפעלת הסוכן האישי"}
                  </button>
                  {form.id && (
                    <button
                      type="button"
                      onClick={() => setForm(emptyProfile)}
                      className="rounded-xl border border-primary/30 px-5 py-3 text-sm font-bold text-primary"
                    >
                      ביטול
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          <AccountSettings />

          {/* הקמה ראשונה של המערכת: כשאין עדיין אף מנהל */}
          {!account.isLoading && !isManager && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => claim(), "קיבלת הרשאת ניהול")}
              className="mt-6 block w-full text-center text-xs text-muted-foreground underline"
            >
              הגדרת החשבון הזה כמנהל הראשון של המערכת
            </button>
          )}
        </>
      )}
    </main>
  );
}
