import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Home,
  MessageCircle,
  MessageSquareHeart,
  Pencil,
  Phone,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  adminDeleteLead,
  adminGetContact,
  adminGetLead,
  adminLeadQuickAction,
  adminReassignLead,
  adminSaveLead,
  type LeadEventRow,
  type QuickActionKey,
} from "@/lib/leads.functions";
import {
  CLOSED_LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PROPERTY_CATEGORIES,
} from "@/lib/leads";
import { adminListLeadFeedback } from "@/lib/feedback.functions";
import { LeadCriteriaCard, intentLabel } from "@/components/site/LeadCriteria";
import type { Listing } from "@/lib/listings";
import type { ManagedSite } from "@/lib/admin.server";

/** אייקון לכל סוג אירוע בציר הזמן */
const EVENT_ICONS: Record<string, LucideIcon> = {
  created: PlusCircle,
  contact_again: RefreshCw,
  status_change: Pencil,
  call: Phone,
  whatsapp: MessageCircle,
  property_sent: Home,
  tour_scheduled: CalendarClock,
  tour_done: CalendarCheck,
  follow_up_set: CalendarClock,
  follow_up_done: CheckCircle2,
  match: Sparkles,
  client_response: MessageSquareHeart,
  note: Pencil,
};

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "";

/** ערך ריק מוצג כ"אין מידע" — אחיד עם שאר האתר */
const orNoInfo = (v: string | null | undefined) => (v && v.trim() ? v : "אין מידע");

const fmtNum = (n: number) => n.toLocaleString("he-IL");

/** תג סטטוס ליומן הפעילות: ok ירוק, failed אדום, skipped אפור, blocked כתום */
export const activityStatusClass = (status: string): string => {
  if (status === "ok") return "bg-whatsapp/15 text-whatsapp";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "blocked") return "bg-orange-100 text-orange-700";
  return "bg-muted text-muted-foreground";
};

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  ok: "הצליח",
  failed: "נכשל",
  skipped: "דולג",
  blocked: "נחסם",
};

/** תגיות ייחוס (מאיפה הגיע הליד) — UTM, מפנה, עמוד נחיתה */
export function AttributionChips({
  utm_source,
  utm_campaign,
  referrer,
  landing_path,
}: {
  utm_source?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
}) {
  const chips = [
    utm_source ? `מקור: ${utm_source}` : null,
    utm_campaign ? `קמפיין: ${utm_campaign}` : null,
    referrer ? `מפנה: ${referrer.replace(/^https?:\/\//, "").slice(0, 40)}` : null,
    landing_path ? `נחיתה: ${landing_path.slice(0, 40)}` : null,
  ].filter((c): c is string => Boolean(c));
  if (!chips.length) return null;
  return (
    <p className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          dir="auto"
          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground"
        >
          {c}
        </span>
      ))}
    </p>
  );
}

/**
 * כרטיס הלקוח — זהות, הסוכן הצמוד, ייחוס ראשון, כל הלידים של אותו אדם
 * (אצל כל הסוכנים), פרופילי חיפוש פעילים ו-30 שורות הפעילות האחרונות.
 * משמש במגירת הליד וביומן הפעילות.
 */
export function ContactCardSection({
  contactId,
  sites,
}: {
  contactId: string;
  sites?: ManagedSite[];
}) {
  const fetchContact = useServerFn(adminGetContact);
  const card = useQuery({
    queryKey: ["admin-contact", contactId],
    queryFn: () => fetchContact({ data: { contactId } }),
  });

  const siteName = (id: string | null) => {
    if (!id) return "אין מידע";
    const s =
      (sites ?? []).find((x) => x.id === id) ?? card.data?.sites.find((x) => x.id === id);
    return s?.name ?? "דף לא מוכר";
  };

  if (card.isLoading) return <p className="text-sm text-muted-foreground">טוען כרטיס לקוח…</p>;
  if (card.isError || !card.data)
    return (
      <p className="text-xs text-muted-foreground">
        כרטיס הלקוח לא זמין ({card.error instanceof Error ? card.error.message : "שגיאה"})
      </p>
    );

  const { contact, leads, profiles, activity } = card.data;
  const closed = new Set<string>(CLOSED_LEAD_STATUSES as readonly string[]);
  const openLeads = leads.filter((l) => !closed.has(l.status)).length;
  const activeProfiles = profiles.filter((p) => p.is_active);
  const budget = (min: number | null, max: number | null) =>
    min != null && max != null
      ? `${fmtNum(min)}–${fmtNum(max)} ₪`
      : max != null
        ? `עד ${fmtNum(max)} ₪`
        : min != null
          ? `מ-${fmtNum(min)} ₪`
          : "אין מידע";
  const rooms = (p: { min_rooms: number | null; rooms: number | null; max_rooms: number | null }) =>
    p.min_rooms != null && p.max_rooms != null
      ? `${p.min_rooms}–${p.max_rooms} חדרים`
      : p.rooms != null
        ? `${p.rooms} חדרים`
        : p.min_rooms != null
          ? `${p.min_rooms}+ חדרים`
          : "אין מידע";

  return (
    <div className="grid gap-3">
      {/* זהות + הסוכן הצמוד */}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs font-bold text-muted-foreground">זהות</p>
          <p className="font-bold text-primary">{orNoInfo(contact.full_name)}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {orNoInfo(contact.phone_normalized)}
          </p>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {orNoInfo(contact.email)}
          </p>
          <p className="mt-1 text-xs">
            {contact.marketing_consent ? "✅ אישר/ה קבלת דיוור" : "❌ ללא הסכמת דיוור"}
            {contact.user_id ? " · משתמש רשום" : ""}
          </p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs font-bold text-muted-foreground">הסוכן הצמוד</p>
          <p className="font-bold text-primary">{siteName(contact.assigned_site_id)}</p>
          <p className="text-xs text-muted-foreground">
            שויך: {contact.assigned_at ? fmtDateTime(contact.assigned_at) : "אין מידע"}
          </p>
          <p className="text-xs text-muted-foreground">
            לקוח מאז: {fmtDateTime(contact.created_at)}
          </p>
        </div>
      </div>

      {/* ייחוס ראשון */}
      <div className="rounded-xl border border-border p-3 text-xs">
        <p className="mb-1 font-bold text-muted-foreground">מאיפה הגיע/ה לראשונה</p>
        <dl className="grid gap-x-3 gap-y-0.5 sm:grid-cols-2">
          {(
            [
              ["מקור ראשון", contact.first_source],
              ["דף ראשון", contact.first_site_id ? siteName(contact.first_site_id) : null],
              ["UTM source", contact.first_utm_source],
              ["UTM campaign", contact.first_utm_campaign],
              ["UTM content", contact.first_utm_content],
              ["מפנה", contact.first_referrer],
              ["עמוד נחיתה", contact.first_landing_path],
            ] as Array<[string, string | null]>
          ).map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <dt className="shrink-0 text-muted-foreground">{k}:</dt>
              <dd className="truncate" dir="auto">
                {orNoInfo(v)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* כל הלידים של הלקוח */}
      <div className="rounded-xl border border-border p-3">
        <p className="text-xs font-bold text-muted-foreground">
          כל הלידים של הלקוח ({leads.length})
          {openLeads > 1 && (
            <span className="ms-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
              כפילות: {openLeads} לידים פתוחים
            </span>
          )}
        </p>
        <ul className="mt-1.5 grid gap-1 text-xs">
          {leads.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-bold text-primary">{siteName(l.site_id)}</span>
              <span className="text-muted-foreground">· {l.source}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${closed.has(l.status) ? "bg-muted text-muted-foreground" : "bg-sun/20 text-primary"}`}
              >
                {l.status}
              </span>
              <span className="text-muted-foreground">{fmtDateTime(l.created_at)}</span>
            </li>
          ))}
          {leads.length === 0 && <li className="text-muted-foreground">אין לידים</li>}
        </ul>
      </div>

      {/* פרופילי חיפוש פעילים */}
      <div className="rounded-xl border border-border p-3">
        <p className="text-xs font-bold text-muted-foreground">
          פרופילי חיפוש פעילים ({activeProfiles.length})
        </p>
        {activeProfiles.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">אין פרופיל חיפוש פעיל</p>
        ) : (
          <ul className="mt-1.5 grid gap-1.5 text-xs">
            {activeProfiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-1">
                <span className="font-bold text-primary">{p.label || "פרופיל"}</span>
                {[
                  intentLabel(p.deal_type),
                  (p.neighborhoods ?? []).join(", ") || null,
                  budget(p.min_price, p.max_price),
                  rooms(p),
                ]
                  .filter((c): c is string => Boolean(c))
                  .map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-bold text-primary"
                    >
                      {c}
                    </span>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* פעילות אחרונה */}
      <div className="rounded-xl border border-border p-3">
        <p className="text-xs font-bold text-muted-foreground">פעילות אחרונה</p>
        {activity.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">אין פעילות רשומה</p>
        ) : (
          <ul className="mt-1.5 grid max-h-64 gap-1 overflow-y-auto text-xs">
            {activity.slice(0, 30).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="shrink-0 text-muted-foreground">{fmtDateTime(a.created_at)}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${activityStatusClass(a.status)}`}
                >
                  {ACTIVITY_STATUS_LABELS[a.status] ?? a.status}
                </span>
                <span className="min-w-0 flex-1 truncate" dir="auto">
                  {a.message ?? a.event}
                  {a.channel ? ` (${a.channel})` : ""}
                </span>
                {a.error && <span className="w-full truncate text-destructive">{a.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** המרה בין ISO ל-input type=datetime-local (בשעון המקומי של הדפדפן) */
const isoToLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const localInputToIso = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

type LeadForm = {
  full_name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  buy_categories: string[];
  sell_categories: string[];
  listing_id: string;
  notes: string;
  next_action: string;
  next_follow_up_at: string; // datetime-local
};

const emptyForm: LeadForm = {
  full_name: "",
  phone: "",
  email: "",
  source: "ידני",
  status: "ליד חדש",
  buy_categories: [],
  sell_categories: [],
  listing_id: "",
  notes: "",
  next_action: "",
  next_follow_up_at: "",
};

/**
 * כרטיס ליד — חלונית עריכה מלאה: פרטי הלקוח, פעולות מהירות וציר זמן.
 * leadId=null פותח מצב יצירה של ליד ידני חדש.
 */
export default function AdminLeadDrawer({
  siteId,
  leadId,
  listings,
  sites,
  isSuperAdmin = false,
  onClose,
  onChanged,
}: {
  siteId: string;
  leadId: string | null;
  listings: Listing[];
  /** כל הדפים המנוהלים — לשמות סוכנים בכרטיס הלקוח ולהעברת ליד (מנהל ראשי) */
  sites?: ManagedSite[];
  isSuperAdmin?: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const fetchLead = useServerFn(adminGetLead);
  const saveLead = useServerFn(adminSaveLead);
  const removeLead = useServerFn(adminDeleteLead);
  const quickAction = useServerFn(adminLeadQuickAction);
  const reassignLead = useServerFn(adminReassignLead);
  // העברה לסוכן אחר (מנהל ראשי בלבד)
  const [reassignTo, setReassignTo] = useState("");

  const detail = useQuery({
    queryKey: ["admin-lead", siteId, leadId],
    queryFn: () => fetchLead({ data: { siteId, leadId: leadId! } }),
    enabled: leadId != null,
  });

  // משוב הלקוח על נכסים (❤️/❌/⭐/📞) — מוצג לסוכן בכרטיס
  const fetchFeedback = useServerFn(adminListLeadFeedback);
  const feedback = useQuery({
    queryKey: ["admin-lead-feedback", siteId, leadId],
    queryFn: () => fetchFeedback({ data: { siteId, leadId: leadId! } }),
    enabled: leadId != null,
  });

  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // פעולות מהירות עם קלט נוסף: בחירת נכס לשליחה / מועד ל-Follow-up חדש
  const [pickListing, setPickListing] = useState(false);
  const [pickListingId, setPickListingId] = useState("");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpAt, setFollowUpAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  const lead = detail.data?.lead ?? null;
  useEffect(() => {
    if (!lead) return;
    setForm({
      full_name: lead.full_name,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      source: lead.source,
      status: lead.status,
      buy_categories: lead.buy_categories ?? [],
      sell_categories: lead.sell_categories ?? [],
      listing_id: lead.listing_id ?? "",
      notes: lead.notes ?? "",
      next_action: lead.next_action ?? "",
      next_follow_up_at: isoToLocalInput(lead.next_follow_up_at),
    });
  }, [lead]);

  const run = async (fn: () => Promise<unknown>, okMsg: string, close = false) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      onChanged();
      if (close) onClose();
      else if (leadId) await detail.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      await saveLead({
        data: {
          siteId,
          lead: {
            ...(leadId ? { id: leadId } : {}),
            full_name: form.full_name,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            source: form.source,
            status: form.status,
            buy_categories: form.buy_categories,
            sell_categories: form.sell_categories,
            listing_id: form.listing_id || null,
            notes: form.notes.trim() || null,
            next_action: form.next_action.trim() || null,
            next_follow_up_at: localInputToIso(form.next_follow_up_at),
          },
        },
      });
    }, "הליד נשמר");

  /** הוספה/הסרה של קטגוריה באחד משני שדות הקטגוריות */
  const toggleCategory = (field: "buy_categories" | "sell_categories", c: string) =>
    setForm({
      ...form,
      [field]: form[field].includes(c) ? form[field].filter((x) => x !== c) : [...form[field], c],
    });

  const act = (
    action: QuickActionKey,
    extra?: { listingId?: string; followUpAt?: string; note?: string | undefined },
  ) =>
    run(
      () =>
        quickAction({
          data: {
            siteId,
            leadId: leadId!,
            action,
            listingId: extra?.listingId ?? null,
            followUpAt: extra?.followUpAt ?? null,
            note: extra?.note ?? null,
          },
        }),
      "הפעולה נרשמה בציר הזמן",
    );

  const waLink = (phone: string) =>
    `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "972")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={leadId ? "כרטיס ליד" : "ליד חדש"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[oklch(0.263_0.038_260/0.6)] p-0 sm:items-center sm:p-4"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-primary">
              {leadId ? (lead?.full_name ?? "כרטיס ליד") : "ליד חדש"}
            </h3>
            {lead && (
              <AttributionChips
                utm_source={lead.utm_source}
                utm_campaign={lead.utm_campaign}
                referrer={lead.referrer}
                landing_path={lead.landing_path}
              />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          {msg && (
            <p className="mb-3 rounded-xl bg-secondary p-2 text-sm font-semibold text-primary">
              {msg}
            </p>
          )}
          {err && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-destructive/10 p-2 text-sm font-semibold text-destructive"
            >
              {err}
            </p>
          )}
          {leadId && detail.isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}

          {/* פעולות מהירות — רק על ליד קיים */}
          {leadId && lead && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold text-muted-foreground">פעולות מהירות</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("call")}
                  className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  התקשרתי
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("whatsapp")}
                  className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  שלחתי WhatsApp
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPickListing((v) => !v)}
                  className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  שלחתי נכס
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("tour_scheduled")}
                  className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  קבעתי סיור
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("tour_done")}
                  className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  בוצע סיור
                </button>
                {lead.next_follow_up_at && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act("follow_up_done")}
                    className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-primary"
                  >
                    Follow-up בוצע ✓
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFollowUpOpen((v) => !v)}
                  className="rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground"
                >
                  קבע Follow-up חדש
                </button>
              </div>

              {pickListing && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className="field max-w-xs"
                    value={pickListingId}
                    onChange={(e) => setPickListingId(e.target.value)}
                  >
                    <option value="">בחרו נכס שנשלח…</option>
                    {listings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !pickListingId}
                    onClick={() => {
                      void act("property_sent", { listingId: pickListingId });
                      setPickListing(false);
                      setPickListingId("");
                    }}
                    className="rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
                  >
                    רישום
                  </button>
                </div>
              )}

              {followUpOpen && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    className="field max-w-56"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                  <input
                    type="text"
                    className="field max-w-xs"
                    placeholder="מה הפעולה הבאה? (לא חובה)"
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={busy || !followUpAt}
                    onClick={() => {
                      const iso = localInputToIso(followUpAt);
                      if (!iso) return;
                      void act("follow_up_set", {
                        followUpAt: iso,
                        note: followUpNote.trim() || undefined,
                      });
                      setFollowUpOpen(false);
                      setFollowUpAt("");
                      setFollowUpNote("");
                    }}
                    className="rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
                  >
                    קביעה
                  </button>
                </div>
              )}
            </div>
          )}

          {/* מה הלקוח מחפש — הקריטריונים המובנים מהטופס/הפרופיל */}
          {lead && <LeadCriteriaCard lead={lead} />}

          {/* כרטיס הלקוח — כל מה שידוע על האדם הזה מעבר לליד הבודד */}
          {lead?.contact_id && (
            <div className="mt-3 rounded-xl border border-border p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-primary">
                <UserRound className="size-4 text-sun" aria-hidden="true" />
                כרטיס הלקוח
              </p>
              <ContactCardSection contactId={lead.contact_id} sites={sites} />
            </div>
          )}

          {/* העברה לסוכן אחר — מנהל ראשי בלבד */}
          {leadId && lead && isSuperAdmin && (sites ?? []).length > 1 && (
            <div className="mt-3 rounded-xl border border-sun/50 p-3">
              <p className="text-sm font-extrabold text-primary">העברה לסוכן אחר</p>
              <p className="text-xs text-muted-foreground">
                הליד (והלקוח, אם יש לו כרטיס לקוח) יעברו לדף של הסוכן שנבחר יחד עם ההיסטוריה.
                ההעברה נרשמת בציר הזמן והכרטיס ייסגר.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  className="field max-w-xs"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">בחרו סוכן / דף…</option>
                  {(sites ?? [])
                    .filter((s) => s.id !== siteId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — /{s.slug}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !reassignTo}
                  onClick={() => {
                    const target = (sites ?? []).find((s) => s.id === reassignTo);
                    if (!confirm(`להעביר את הליד אל ${target?.name ?? "הסוכן שנבחר"}?`)) return;
                    void run(
                      () => reassignLead({ data: { leadId, toSiteId: reassignTo } }),
                      "הליד הועבר",
                      true,
                    );
                  }}
                  className="rounded-xl bg-sun px-3 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
                >
                  אישור ההעברה
                </button>
              </div>
            </div>
          )}

          {/* משוב הלקוח על נכסים */}
          {(feedback.data ?? []).length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-extrabold text-primary">משוב הלקוח על נכסים</p>
              <ul className="mt-2 grid gap-1.5 text-xs">
                {(feedback.data ?? []).map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">
                      {f.reaction === "interested"
                        ? "❤️ מעניין אותי"
                        : f.reaction === "not_relevant"
                          ? "❌ לא מתאים"
                          : f.reaction === "favorite"
                            ? "⭐ שמר"
                            : "📞 ביקש שיחה"}
                    </span>
                    <span className="text-muted-foreground">
                      {f.listing?.title ?? "נכס"} ·{" "}
                      {new Date(f.created_at).toLocaleDateString("he-IL")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* טופס פרטי הליד */}
          {(!leadId || lead) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">שם מלא *</span>
                <input
                  className="field"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">טלפון</span>
                <input
                  className="field"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">מייל</span>
                <input
                  className="field"
                  dir="ltr"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  מקור הליד
                </span>
                <select
                  className="field"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">סטטוס</span>
                <select
                  className="field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {/* מה הליד מחפש ומה הוא מציע — בחירה מרובה מאותה רשימת קטגוריות */}
              {(
                [
                  ["buy_categories", "מה מחפש לקנות / לשכור"],
                  ["sell_categories", "מה רוצה למכור"],
                ] as Array<["buy_categories" | "sell_categories", string]>
              ).map(([field, label]) => (
                <fieldset key={field} className="block sm:col-span-2">
                  <legend className="mb-1 block text-xs font-bold text-muted-foreground">
                    {label} (אפשר לבחור כמה)
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggleCategory(field, c)}
                        aria-pressed={form[field].includes(c)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          form[field].includes(c)
                            ? "border-sun bg-sun text-sun-foreground"
                            : "border-border text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  הנכס שבגללו פנה (אם קיים)
                </span>
                <select
                  className="field"
                  value={form.listing_id}
                  onChange={(e) => setForm({ ...form, listing_id: e.target.value })}
                >
                  <option value="">ללא נכס</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">הערות</span>
                <textarea
                  className="field min-h-20"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  הפעולה הבאה
                </span>
                <input
                  className="field"
                  value={form.next_action}
                  onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  Follow-up הבא (תאריך ושעה)
                </span>
                <input
                  type="datetime-local"
                  className="field"
                  value={form.next_follow_up_at}
                  onChange={(e) => setForm({ ...form, next_follow_up_at: e.target.value })}
                />
              </label>
            </div>
          )}

          {(!leadId || lead) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || !form.full_name.trim()}
                onClick={() => void submit()}
                className="rounded-xl bg-sun px-5 py-2 text-sm font-bold text-sun-foreground disabled:opacity-50"
              >
                {leadId ? "שמירת הכרטיס" : "יצירת הליד"}
              </button>
              {lead?.phone && (
                <>
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm font-bold text-primary underline"
                  >
                    חיוג
                  </a>
                  <a
                    href={waLink(lead.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-whatsapp underline"
                  >
                    WhatsApp
                  </a>
                </>
              )}
              {leadId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!confirm("למחוק את הליד וכל ההיסטוריה שלו?")) return;
                    void run(() => removeLead({ data: { siteId, leadId } }), "הליד נמחק", true);
                  }}
                  className="ms-auto inline-flex items-center gap-1 text-sm font-bold text-destructive underline"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  מחיקה
                </button>
              )}
            </div>
          )}

          {/* ציר הזמן */}
          {leadId && (detail.data?.events ?? []).length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-extrabold text-primary">ציר הזמן</p>
              <ul className="grid gap-2">
                {(detail.data?.events ?? []).map((ev: LeadEventRow) => {
                  const Icon = EVENT_ICONS[ev.event_type] ?? Pencil;
                  return (
                    <li
                      key={ev.id}
                      className="flex items-start gap-2 rounded-xl border border-border p-2"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden="true" />
                      <div>
                        <p className="text-sm text-primary">{ev.note ?? ev.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDateTime(ev.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
