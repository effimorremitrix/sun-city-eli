import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, BellRing, Sparkles, LogOut, User } from "lucide-react";
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
import { adminLeadsAttentionCount, respondToNotification } from "@/lib/leads.functions";
import { CLIENT_RESPONSES, type ClientResponse } from "@/lib/leads";
import { LangProvider, useLang, useStoredLocale } from "@/lib/i18n";
import { formatListingPrice } from "@/lib/listings";
import { listingDealToIntent, toListingDeal } from "@/lib/deal-type";
import type { ListingFilters } from "@/lib/listings";
import { formatUpdated } from "@/lib/site-live";
import { useAuth } from "@/hooks/useAuth";
import { useBackToSiteHref } from "@/lib/back-to-site";
import AccountSettings from "@/components/site/AccountSettings";
import { NeighborhoodPicker } from "@/components/site/NeighborhoodPicker";
import { PortalAiSearch, PortalExtrasSections } from "@/components/portal/PortalSections";
import { AdminPanel, type AdminTabKey } from "@/components/site/AdminPanel";

const title = 'האזור האישי | סאן סיטי נדל"ן';
const description =
  "האזור האישי שלכם: הגדרת סוכן אישי, פרופיל חיפוש דירה בנתניה והתראות על נכסים חדשים.";

type TabKey = "overview" | AdminTabKey;

const TAB_KEYS: TabKey[] = [
  "overview",
  "listings",
  "leads",
  "sold",
  "stats",
  "scout",
  "content",
  "testimonials",
  "field",
  "publish",
  "agents",
  "clients",
  "usage",
  "activity",
  "settings",
  "system",
  "market",
  "guide",
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
  deal_type: "קנייה",
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
  // הטופס מציע רק "קנייה" / "שכירות"; ערך ישן "מכירה" בפרופיל = קנייה
  deal_type: listingDealToIntent(toListingDeal(p.deal_type)),
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

/**
 * טיוטת חיפוש מהאתר הציבורי (PropertySection שומר אותה אחרי חיפוש חכם או
 * סינון ידני) — ממלאת את פרופיל החיפוש החדש פעם אחת, ואז נמחקת.
 */
const DRAFT_SEARCH_KEY = "suncity:draft-search";
type DraftSearch = { query?: string; filters?: ListingFilters; at?: number };

const readDraftSearch = (): DraftSearch | null => {
  try {
    const raw = localStorage.getItem(DRAFT_SEARCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as DraftSearch) : null;
  } catch {
    return null;
  }
};

const clearDraftSearch = () => {
  try {
    localStorage.removeItem(DRAFT_SEARCH_KEY);
  } catch {
    /* אחסון חסום */
  }
};

const numStr = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : "";

const draftToForm = (draft: DraftSearch, base: ProfileForm): ProfileForm => {
  const f = draft.filters ?? {};
  const query = (draft.query ?? "").trim();
  return {
    ...base,
    label: query ? query.slice(0, 80) : base.label,
    deal_type: f.deal_type ? listingDealToIntent(toListingDeal(f.deal_type)) : base.deal_type,
    neighborhoods: Array.isArray(f.neighborhoods)
      ? f.neighborhoods.map(String)
      : base.neighborhoods,
    street: f.street ?? base.street,
    min_price: numStr(f.min_price),
    max_price: numStr(f.max_price),
    rooms: numStr(f.rooms),
    min_rooms: numStr(f.min_rooms),
    max_rooms: numStr(f.max_rooms),
    min_size: numStr(f.min_size),
    needs_mamad: f.needs_mamad === true,
    needs_elevator: f.needs_elevator === true,
    needs_parking: f.needs_parking === true,
    needs_balcony: f.needs_balcony === true,
  };
};

/** לדף אין סגמנט שפה בכתובת — השפה נלקחת מהבחירה האחרונה באתר הציבורי */
function AccountPage() {
  const lang = useStoredLocale();
  return (
    <LangProvider lang={lang}>
      <AccountContent />
    </LangProvider>
  );
}

function AccountContent() {
  const { t, dir } = useLang();
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
  const fetchLeadsAttention = useServerFn(adminLeadsAttentionCount);

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [draftPrefilled, setDraftPrefilled] = useState(false);
  const draftChecked = useRef(false);
  // המזהה של הפרופיל שבעריכה — לבדיקה בתוך האפקט בלי להריץ אותו מחדש על כל הקלדה
  const editingIdRef = useRef<string | undefined>(undefined);
  editingIdRef.current = form.id;

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

  // טיוטת חיפוש מהאתר — ללקוחות (לא אדמין), פעם אחת, רק כשהטופס ריק (פרופיל חדש)
  useEffect(() => {
    if (draftChecked.current || !account.data || isAdmin) return;
    draftChecked.current = true;
    const draft = readDraftSearch();
    if (!draft) return;
    clearDraftSearch();
    if (editingIdRef.current) return;
    setForm((current) => draftToForm(draft, current));
    setDraftPrefilled(true);
  }, [account.data, isAdmin]);

  const scoutCount = useQuery({
    queryKey: ["scout-new-count"],
    queryFn: () => fetchScoutCount(),
    enabled: isSuperAdmin,
  });
  const newCount = scoutCount.data?.count ?? 0;

  // תגית תשומת-לב לטאב הלידים: משימות באיחור + לידים חדשים שטרם טופלו
  const leadsAttention = useQuery({
    queryKey: ["leads-attention-count"],
    queryFn: () => fetchLeadsAttention(),
    enabled: isManager,
  });
  const attentionCount = leadsAttention.data?.count ?? 0;

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await account.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.portal.actionFailed);
    } finally {
      setBusy(false);
    }
  };

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
    }, t.portal.profileSaved);

  const notifications = account.data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;
  const backHref = useBackToSiteHref();

  return (
    <div dir={dir}>
      {/* סרגל עליון דביק — "לאתר" והתנתקות נגישים תמיד, גם בנייד */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2.5">
          <a
            href={backHref}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-bold text-primary transition hover:bg-muted"
          >
            <ArrowRight className="size-4 rtl:block ltr:hidden" aria-hidden="true" />
            <ArrowLeft className="size-4 rtl:hidden ltr:block" aria-hidden="true" />
            {t.portal.toSite}
          </a>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-sm font-bold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t.portal.logout}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">
            {isManager
              ? t.portal.managerHeading
              : user?.fullName
                ? t.portal.helloName(user.fullName)
                : t.portal.heading}
          </h1>
          {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
        </div>

        {msg && (
          <p className="mt-4 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">
            {msg}
          </p>
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
                ["leads", attentionCount > 0 ? `לידים (${attentionCount})` : "לידים"],
                ["sold", "נמכרו"],
                ["stats", "סטטיסטיקות"],
                ...(isSuperAdmin
                  ? ([["scout", newCount > 0 ? `סוכן סריקה (${newCount})` : "סוכן סריקה"]] as Array<
                      [TabKey, string]
                    >)
                  : []),
                ["content", "תוכן העסק"],
                ["testimonials", "ממליצים"],
                ["field", "מהשטח"],
                ["publish", "פרסום"],
                ["activity", "יומן פעילות"],
                ...(isSuperAdmin
                  ? ([
                      ["market", "מאגר השוק"],
                      ["agents", "סוכנים וצוות"],
                      ["clients", "לקוחות רשומים"],
                      ["usage", "שימוש (Usage)"],
                      ["settings", "הגדרות"],
                      ["system", "מערכת"],
                    ] as Array<[TabKey, string]>)
                  : []),
                ["guide", "מדריך"],
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
                {t.portal.profileTitle}
              </h2>
              {editingName ? (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="block flex-1 min-w-[12rem]">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      {t.portal.fullName}
                    </span>
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
                        }, t.portal.nameSaved)
                      }
                      className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground disabled:opacity-60"
                    >
                      {t.portal.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(user?.fullName ?? "");
                        setEditingName(false);
                      }}
                      className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
                    >
                      {t.portal.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-foreground">
                    <span className="font-bold">{t.portal.nameLabel}</span>{" "}
                    {user?.fullName?.trim() || t.portal.nameNotSet}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(user?.fullName ?? "");
                      setEditingName(true);
                    }}
                    className="text-sm font-semibold text-primary underline"
                  >
                    {t.portal.editName}
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
                {/* חיפוש חכם בכל השוק — נכסי המשרד + מודעות מהלוחות */}
                <PortalAiSearch onMessage={setMsg} />

                {/* התראות */}
                <section className="soft-card mt-6 p-5">
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                    <BellRing className="size-5 text-sun" aria-hidden="true" />
                    {t.portal.notificationsTitle}{" "}
                    {unread > 0 && (
                      <span className="text-sm text-sun">{t.portal.newCount(unread)}</span>
                    )}
                  </h2>
                  {account.isLoading && (
                    <p className="mt-2 text-sm text-muted-foreground">{t.portal.loading}</p>
                  )}
                  {!account.isLoading && notifications.length === 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">{t.portal.noNotifications}</p>
                  )}
                  <ul className="mt-3 grid gap-3">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`rounded-xl border p-3 ${n.read_at ? "border-border" : "border-sun bg-secondary/60"}`}
                      >
                        {/* התראה על מודעה מהשוק מגיעה בלי listing — הכותרת היא הסיבה;
                            "נכס הוסר" רק כשאין לא נכס ולא סיבה */}
                        <p className="font-bold text-primary">
                          {n.listing?.title ?? n.reason ?? t.portal.listingRemoved}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {n.listing && (
                            <>
                              {n.listing.neighborhood
                                ? (t.maps.neighborhoods[n.listing.neighborhood] ??
                                  n.listing.neighborhood)
                                : t.misc.noInfo}{" "}
                              · {formatListingPrice(n.listing.price)} ·{" "}
                            </>
                          )}
                          {formatUpdated(n.created_at)}
                        </p>
                        {n.listing && n.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">{n.reason}</p>
                        )}
                        {/* תגובה מהירה — יוצרת משימת Follow-up אצל הסוכן המטפל */}
                        {n.response ? (
                          <p className="mt-2 rounded-lg bg-secondary p-2 text-xs font-semibold text-primary">
                            {t.portal.responseReceived(
                              t.portal.responses[n.response] ??
                                CLIENT_RESPONSES[n.response as ClientResponse] ??
                                n.response,
                            )}
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(Object.keys(CLIENT_RESPONSES) as ClientResponse[]).map((key) => (
                              <button
                                key={key}
                                type="button"
                                disabled={busy}
                                className="rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
                                onClick={() =>
                                  run(
                                    () =>
                                      respond({ data: { notificationId: n.id, response: key } }),
                                    t.portal.respondOk,
                                  )
                                }
                              >
                                {t.portal.responses[key] ?? CLIENT_RESPONSES[key]}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex gap-3 text-sm">
                          <a
                            href={
                              n.listing
                                ? `${backHref}?listing=${n.listing.id}#properties`
                                : `${backHref}#properties`
                            }
                            className="underline"
                          >
                            {t.portal.viewOnSite}
                          </a>
                          {!n.read_at && (
                            <button
                              type="button"
                              disabled={busy}
                              className="underline"
                              onClick={() =>
                                run(() => markRead({ data: { id: n.id } }), t.portal.markedRead)
                              }
                            >
                              {t.portal.markRead}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* הסוכן המטפל, התאמות עם אחוז התאמה ונכסים שמורים */}
                <PortalExtrasSections onMessage={setMsg} />

                {/* פרופילי חיפוש */}
                <section className="soft-card mt-6 p-5">
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
                    <Sparkles className="size-5 text-sun" aria-hidden="true" />
                    {t.portal.agentTitle}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t.portal.agentText}</p>

                  <ul className="mt-4 grid gap-3">
                    {(account.data?.profiles ?? []).map((p) => (
                      <li key={p.id} className="rounded-xl border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-primary">
                              {p.label}{" "}
                              {!p.is_active && (
                                <span className="text-xs text-muted-foreground">
                                  {t.portal.profileInactive}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.maps.deal[p.deal_type] ?? p.deal_type} ·{" "}
                              {p.neighborhoods?.length
                                ? p.neighborhoods
                                    .map((n) => t.maps.neighborhoods[n] ?? n)
                                    .join(", ")
                                : t.portal.allAreas}{" "}
                              ·{" "}
                              {p.max_price
                                ? t.portal.upTo(`${p.max_price.toLocaleString("he-IL")} ₪`)
                                : t.portal.noPriceLimit}{" "}
                              ·{" "}
                              {p.rooms
                                ? t.portal.roomsExact(String(p.rooms))
                                : p.min_rooms
                                  ? t.portal.roomsMin(String(p.min_rooms))
                                  : t.portal.anyRooms}
                              {p.street ? ` · ${t.portal.street(p.street)}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <button
                              type="button"
                              className="underline"
                              onClick={() => setForm(toForm(p))}
                            >
                              {t.portal.edit}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="text-destructive underline"
                              onClick={() =>
                                run(
                                  () => removeProfile({ data: { id: p.id } }),
                                  t.portal.profileDeleted,
                                )
                              }
                            >
                              {t.portal.delete}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <h3 className="mt-5 text-sm font-extrabold text-primary">
                    {form.id ? t.portal.editProfile : t.portal.newProfile}
                  </h3>
                  {draftPrefilled && !form.id && (
                    <p
                      className="mt-2 flex items-center gap-1.5 rounded-xl bg-secondary p-2.5 text-xs font-semibold text-primary"
                      aria-live="polite"
                    >
                      <Sparkles className="size-3.5 shrink-0 text-sun" aria-hidden="true" />
                      {t.portal.draftPrefilled}
                    </p>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-muted-foreground">
                        {t.portal.profileLabel}
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
                        {t.portal.dealTypeLabel}
                      </span>
                      <select
                        className="field"
                        value={form.deal_type}
                        onChange={(e) => setForm({ ...form, deal_type: e.target.value })}
                      >
                        {/* "קנייה" = כוונת קונה — תואמת נכסים שעומדים למכירה */}
                        <option value="קנייה">{t.portal.dealBuy}</option>
                        <option value="השכרה">{t.portal.dealRent}</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-muted-foreground">
                        {t.portal.city}
                      </span>
                      <input
                        className="field"
                        value={form.city}
                        maxLength={60}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-muted-foreground">
                        {t.portal.streetOptional}
                      </span>
                      <input
                        className="field"
                        value={form.street}
                        maxLength={80}
                        placeholder={t.portal.streetPlaceholder}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-muted-foreground">
                        {t.portal.roomsExactLabel}
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
                        {t.portal.minPrice}
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
                        {t.portal.maxPrice}
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
                        {t.portal.minRooms}
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
                        {t.portal.maxRooms}
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
                        {t.portal.minSize}
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
                        {t.portal.notesToAgent}
                      </span>
                      <textarea
                        className="field min-h-20"
                        value={form.notes}
                        maxLength={500}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <NeighborhoodPicker
                      value={form.neighborhoods}
                      onChange={(next) => setForm({ ...form, neighborhoods: next })}
                      label={t.portal.areasLegend}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {(
                      [
                        ["needs_mamad", t.portal.needMamad],
                        ["needs_elevator", t.portal.needElevator],
                        ["needs_parking", t.portal.needParking],
                        ["needs_balcony", t.portal.needBalcony],
                        ["notify_email", t.portal.notifyEmail],
                        ["notify_whatsapp", t.portal.notifyWhatsapp],
                        ["is_active", t.portal.profileActive],
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
                        {t.portal.whatsappNumber}
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
                      {form.id ? t.portal.updateProfile : t.portal.activateAgent}
                    </button>
                    {form.id && (
                      <button
                        type="button"
                        onClick={() => setForm(emptyProfile)}
                        className="rounded-xl border border-primary/30 px-5 py-3 text-sm font-bold text-primary"
                      >
                        {t.portal.cancel}
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
    </div>
  );
}
