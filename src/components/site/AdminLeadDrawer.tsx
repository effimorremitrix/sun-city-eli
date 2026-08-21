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
  X,
  type LucideIcon,
} from "lucide-react";
import {
  adminDeleteLead,
  adminGetLead,
  adminLeadQuickAction,
  adminSaveLead,
  type LeadEventRow,
  type QuickActionKey,
} from "@/lib/leads.functions";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/leads";
import type { Listing } from "@/lib/listings";

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
  onClose,
  onChanged,
}: {
  siteId: string;
  leadId: string | null;
  listings: Listing[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const fetchLead = useServerFn(adminGetLead);
  const saveLead = useServerFn(adminSaveLead);
  const removeLead = useServerFn(adminDeleteLead);
  const quickAction = useServerFn(adminLeadQuickAction);

  const detail = useQuery({
    queryKey: ["admin-lead", siteId, leadId],
    queryFn: () => fetchLead({ data: { siteId, leadId: leadId! } }),
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
            listing_id: form.listing_id || null,
            notes: form.notes.trim() || null,
            next_action: form.next_action.trim() || null,
            next_follow_up_at: localInputToIso(form.next_follow_up_at),
          },
        },
      });
    }, "הליד נשמר");

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
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <h3 className="text-lg font-extrabold text-primary">
            {leadId ? (lead?.full_name ?? "כרטיס ליד") : "ליד חדש"}
          </h3>
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
