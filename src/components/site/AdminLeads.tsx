import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarClock, ListTodo, Plus, Sparkles } from "lucide-react";
import { adminListFollowUps, adminListLeads, type LeadRow } from "@/lib/leads.functions";
import { adminListTasks, adminSetTaskStatus } from "@/lib/crm.functions";
import { isTaskOverdue } from "@/lib/crm";
import { LEAD_STATUSES } from "@/lib/leads";
import { leadCriteriaChips } from "@/components/site/LeadCriteria";
import AdminLeadDrawer from "@/components/site/AdminLeadDrawer";
import AdminPipeline from "@/components/site/AdminPipeline";
import type { Listing } from "@/lib/listings";
import type { ManagedSite } from "@/lib/admin.server";

type SubTab = "tasks" | "all" | "board";

/** שלוש הספירות שמוצגות מעל דליי ה-Follow-up של הסוכן */
type MyCounts = { newLeads: number; followUpsToday: number; overdue: number };

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "";

/** צבע התג לפי הסטטוס — הבחנה מהירה בין שלבי המשפך */
const statusChipClass = (status: string): string => {
  if (status === "ליד חדש") return "bg-sun/20 text-primary";
  if (status === "נסגרה עסקה") return "bg-whatsapp/20 text-primary";
  if (status === "לא רלוונטי" || status === "לא בשל כרגע") return "bg-muted text-muted-foreground";
  return "bg-secondary text-primary";
};

function LeadListItem({ lead, onOpen }: { lead: LeadRow; onOpen: () => void }) {
  // "מה הלקוח מחפש": הקריטריונים המובנים; קטגוריות הקנייה/מכירה כתגיות משלימות
  const criteriaChips = leadCriteriaChips(lead);
  const categories = [
    ...(lead.buy_categories ?? []).map((c) => ({ key: `buy-${c}`, label: `קנייה: ${c}` })),
    ...(lead.sell_categories ?? []).map((c) => ({ key: `sell-${c}`, label: `מכירה: ${c}` })),
  ];
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-start font-bold text-primary underline-offset-2 hover:underline"
        >
          {lead.full_name}
        </button>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusChipClass(lead.status)}`}
        >
          {lead.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {lead.source}
        {lead.phone && (
          <>
            {" · "}
            <a href={`tel:${lead.phone}`} dir="ltr" className="underline">
              {lead.phone}
            </a>
          </>
        )}
        {lead.email && (
          <>
            {" · "}
            <a href={`mailto:${lead.email}`} dir="ltr" className="underline">
              {lead.email}
            </a>
          </>
        )}
        {lead.listing?.title && <> · {lead.listing.title}</>}
        {lead.created_at && <> · {fmtDateTime(lead.created_at)}</>}
      </p>
      {criteriaChips.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {criteriaChips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-sun/15 px-2 py-0.5 text-[11px] font-bold text-primary"
            >
              {c}
            </span>
          ))}
        </p>
      )}
      {categories.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {categories.map((c) => (
            <span
              key={c.key}
              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground"
            >
              {c.label}
            </span>
          ))}
        </p>
      )}
      {lead.notes && (
        <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-foreground/80">
          {lead.notes.length > 220 ? `${lead.notes.slice(0, 220)}…` : lead.notes}
        </p>
      )}
      {(lead.next_action || lead.next_follow_up_at) && (
        <p className="mt-1 text-xs text-primary">
          {lead.next_follow_up_at && (
            <span className="font-bold">{fmtDateTime(lead.next_follow_up_at)}</span>
          )}
          {lead.next_follow_up_at && lead.next_action && " — "}
          {lead.next_action}
        </p>
      )}
    </li>
  );
}

function Bucket({
  title,
  leads,
  tone = "default",
  emptyText,
  onOpen,
}: {
  title: string;
  leads: LeadRow[];
  tone?: "default" | "danger";
  emptyText?: string;
  onOpen: (id: string) => void;
}) {
  if (!leads.length && !emptyText) return null;
  return (
    <section
      className={
        tone === "danger"
          ? "rounded-xl border-2 border-destructive/60 bg-destructive/5 p-3"
          : "rounded-xl border border-border p-3"
      }
    >
      <h3
        className={`flex items-center gap-2 text-sm font-extrabold ${tone === "danger" ? "text-destructive" : "text-primary"}`}
      >
        {tone === "danger" && <AlertTriangle className="size-4" aria-hidden="true" />}
        {title} ({leads.length})
      </h3>
      {leads.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {leads.map((l) => (
            <LeadListItem key={l.id} lead={l} onOpen={() => onOpen(l.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * טאב הלידים באזור הניהול: "המשימות שלי" (המשימות הפתוחות ודליי ה-Follow-up),
 * "כל הלידים" ו"לוח הפייפליין". הכול בסקופ של האתר הנבחר בבורר הסוכנים;
 * בלוח הפייפליין הסוכן רואה את הדף שלו והמנהל הראשי את כל הצוות.
 */
export default function AdminLeads({
  siteId,
  isSuperAdmin,
  listings,
  sites,
}: {
  siteId: string;
  isSuperAdmin: boolean;
  listings: Listing[];
  sites: ManagedSite[];
}) {
  const fetchFollowUps = useServerFn(adminListFollowUps);
  const fetchLeads = useServerFn(adminListLeads);
  const fetchTasks = useServerFn(adminListTasks);
  const setTaskStatus = useServerFn(adminSetTaskStatus);

  const [sub, setSub] = useState<SubTab>("tasks");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);

  const followUps = useQuery({
    queryKey: ["admin-follow-ups", siteId],
    queryFn: () => fetchFollowUps({ data: { siteId } }),
    enabled: sub === "tasks",
  });

  // המשימות הפתוחות של הדף — הרשימה שהסוכן עובד ממנה בבוקר
  const tasks = useQuery({
    queryKey: ["admin-site-tasks", siteId],
    queryFn: () => fetchTasks({ data: { siteId } }),
    enabled: sub === "tasks",
  });

  const leads = useQuery({
    queryKey: ["admin-leads", siteId, statusFilter, q],
    queryFn: () =>
      fetchLeads({ data: { siteId, status: statusFilter || null, q: q.trim() || null } }),
    enabled: sub === "all",
  });

  const refetchAll = () => {
    void followUps.refetch();
    void tasks.refetch();
    void leads.refetch();
  };

  const completeTask = async (taskId: string) => {
    setTaskBusy(true);
    try {
      await setTaskStatus({ data: { siteId, taskId, status: "הושלמה" } });
      refetchAll();
    } finally {
      setTaskBusy(false);
    }
  };

  const buckets = followUps.data;
  const openTasks = tasks.data ?? [];
  const overdueTasks = openTasks.filter((t) => isTaskOverdue(t));
  const myCounts: MyCounts | null = buckets
    ? {
        newLeads: buckets.untouched.length,
        followUpsToday: buckets.today.length,
        overdue: buckets.overdue.length,
      }
    : null;

  return (
    <section className="soft-card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Sparkles className="size-5 text-sun" aria-hidden="true" />
          לידים ו-Follow-up
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
        >
          <Plus className="size-4" aria-hidden="true" />
          ליד חדש
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["tasks", "המשימות / Follow-up שלי"],
            ["all", "כל הלידים"],
            ["board", isSuperAdmin ? "לוח הצוות" : "לוח הפייפליין"],
          ] as Array<[SubTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={sub === key}
            onClick={() => setSub(key)}
            className={
              sub === key
                ? "rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
                : "rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* המשימות שלי — דליים לפי מועד */}
      {sub === "tasks" && (
        <div className="mt-4 grid gap-3">
          {followUps.isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}
          {buckets && (
            <>
              {myCounts && (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["overdue", "באיחור"],
                      ["followUpsToday", "להיום"],
                      ["newLeads", "חדשים שטרם טופלו"],
                    ] as Array<[keyof MyCounts, string]>
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className={`rounded-xl border p-2 text-center ${key === "overdue" && myCounts[key] > 0 ? "border-destructive/60 bg-destructive/5" : "border-border"}`}
                    >
                      <p
                        className={`text-xl font-extrabold ${key === "overdue" && myCounts[key] > 0 ? "text-destructive" : "text-primary"}`}
                      >
                        {myCounts[key]}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* המשימות הפתוחות — רשימה אחת לכל הלידים של הדף */}
              <section
                className={
                  overdueTasks.length
                    ? "rounded-xl border-2 border-destructive/60 bg-destructive/5 p-3"
                    : "rounded-xl border border-border p-3"
                }
              >
                <h3
                  className={`flex items-center gap-2 text-sm font-extrabold ${overdueTasks.length ? "text-destructive" : "text-primary"}`}
                >
                  <ListTodo className="size-4" aria-hidden="true" />
                  משימות פתוחות ({openTasks.length}
                  {overdueTasks.length > 0 ? `, מתוכן ${overdueTasks.length} באיחור` : ""})
                </h3>
                {tasks.isLoading && <p className="mt-2 text-xs text-muted-foreground">טוען…</p>}
                {!tasks.isLoading && openTasks.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    אין משימות פתוחות. משימה נוספת מכרטיס הליד, ומועד יעד שולח תזכורת אוטומטית.
                  </p>
                )}
                {openTasks.length > 0 && (
                  <ul className="mt-2 grid gap-1.5">
                    {openTasks.slice(0, 40).map((t) => {
                      const late = isTaskOverdue(t);
                      return (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2"
                        >
                          <button
                            type="button"
                            disabled={taskBusy}
                            onClick={() => void completeTask(t.id)}
                            className="rounded-lg border border-border px-2 py-1 text-xs font-bold text-primary disabled:opacity-50"
                          >
                            ✓ בוצע
                          </button>
                          <button
                            type="button"
                            onClick={() => t.lead && setOpenLeadId(t.lead.id)}
                            className="text-start text-sm font-bold text-primary underline-offset-2 hover:underline"
                          >
                            {t.title}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {t.lead?.full_name ?? "לקוח"}
                            {t.due_at && (
                              <>
                                {" · "}
                                <span className={late ? "font-bold text-destructive" : ""}>
                                  {fmtDateTime(t.due_at)}
                                </span>
                              </>
                            )}
                          </span>
                          {t.lead?.phone && (
                            <a
                              href={`tel:${t.lead.phone}`}
                              dir="ltr"
                              className="text-xs font-bold text-primary underline"
                            >
                              {t.lead.phone}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <Bucket
                title="באיחור — לטיפול מיידי"
                leads={buckets.overdue}
                tone="danger"
                onOpen={setOpenLeadId}
              />
              <Bucket
                title="להיום"
                leads={buckets.today}
                emptyText="אין משימות להיום."
                onOpen={setOpenLeadId}
              />
              <Bucket
                title="לידים חדשים שעדיין לא טופלו"
                leads={buckets.untouched}
                emptyText="אין לידים חדשים שממתינים לטיפול."
                onOpen={setOpenLeadId}
              />
              <Bucket title="מחר" leads={buckets.tomorrow} onOpen={setOpenLeadId} />
              <Bucket title="השבוע" leads={buckets.thisWeek} onOpen={setOpenLeadId} />
              {buckets.overdue.length === 0 &&
                buckets.today.length === 0 &&
                buckets.untouched.length === 0 &&
                buckets.tomorrow.length === 0 &&
                buckets.thisWeek.length === 0 && (
                  <p className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
                    <CalendarClock className="size-4" aria-hidden="true" />
                    אין משימות פתוחות. קבעו Follow-up לכל ליד פעיל כדי שלא יילך לאיבוד.
                  </p>
                )}
            </>
          )}
        </div>
      )}

      {/* כל הלידים — סינון וחיפוש */}
      {sub === "all" && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <select
              className="field max-w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">כל הסטטוסים</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="field max-w-60"
              placeholder="חיפוש שם / טלפון / מייל"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {leads.isLoading && <p className="mt-3 text-sm text-muted-foreground">טוען…</p>}
          {!leads.isLoading && (leads.data ?? []).length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              אין לידים עדיין. לידים נקלטים אוטומטית מטפסי האתר ומהסוכן האישי, ואפשר להוסיף ידנית עם
              "ליד חדש".
            </p>
          )}
          <ul className="mt-3 grid gap-2">
            {(leads.data ?? []).map((l) => (
              <LeadListItem key={l.id} lead={l} onOpen={() => setOpenLeadId(l.id)} />
            ))}
          </ul>
        </div>
      )}

      {/* לוח הפייפליין — הסוכן רואה את הדף שלו, המנהל את כל הצוות */}
      {sub === "board" && <AdminPipeline isSuperAdmin={isSuperAdmin} />}

      {(openLeadId || creating) && (
        <AdminLeadDrawer
          siteId={siteId}
          leadId={creating ? null : openLeadId}
          listings={listings}
          sites={sites}
          isSuperAdmin={isSuperAdmin}
          onClose={() => {
            setOpenLeadId(null);
            setCreating(false);
          }}
          onChanged={refetchAll}
        />
      )}
    </section>
  );
}
