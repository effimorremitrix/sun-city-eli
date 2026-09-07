import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Check, ListTodo, Plus, Trash2, Undo2 } from "lucide-react";
import {
  adminDeleteLeadTask,
  adminListLeadTasks,
  adminSaveLeadTask,
  adminSetTaskStatus,
} from "@/lib/crm.functions";
import { TASK_KINDS, TASK_PRESETS, isTaskOverdue, type LeadTask } from "@/lib/crm";

/* ============================================================
 * משימות הליד. ליד אחד יכול לשאת כמה משימות פתוחות; המסד מסנכרן את
 * "המשימה הבאה" חזרה ל-next_follow_up_at, ולכן דליי ה-Follow-up ומונה
 * תשומת הלב ממשיכים לעבוד בלי שינוי.
 * ============================================================ */

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "";

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

const inHoursIso = (hours: number): string => new Date(Date.now() + hours * 3600_000).toISOString();

function TaskRow({
  task,
  busy,
  onToggle,
  onDelete,
}: {
  task: LeadTask;
  busy: boolean;
  onToggle: (next: string) => void;
  onDelete: () => void;
}) {
  const done = task.status === "הושלמה";
  const cancelled = task.status === "בוטלה";
  const overdue = isTaskOverdue(task);
  return (
    <li
      className={`flex items-start gap-2 rounded-xl border p-2 ${
        overdue ? "border-destructive/60 bg-destructive/5" : "border-border"
      }`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(done ? "פתוחה" : "הושלמה")}
        aria-label={done ? "החזרה למשימה פתוחה" : "סימון כהושלמה"}
        className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border ${
          done
            ? "border-whatsapp bg-whatsapp/20 text-primary"
            : "border-border text-muted-foreground"
        }`}
      >
        {done ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-bold ${done || cancelled ? "text-muted-foreground line-through" : "text-primary"}`}
        >
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {task.kind}
          {task.due_at && (
            <>
              {" · "}
              <span className={overdue ? "font-bold text-destructive" : ""}>
                {fmtDateTime(task.due_at)}
              </span>
            </>
          )}
          {cancelled && " · בוטלה"}
          {done && task.completed_at && ` · הושלמה ${fmtDateTime(task.completed_at)}`}
        </p>
        {task.notes && (
          <p className="mt-1 whitespace-pre-line text-xs text-foreground/80">{task.notes}</p>
        )}
      </div>
      {!done && !cancelled && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle("בוטלה")}
          className="text-xs font-bold text-muted-foreground underline"
        >
          ביטול
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        aria-label="מחיקת המשימה"
        className="text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export default function AdminLeadTasks({
  siteId,
  leadId,
  onChanged,
}: {
  siteId: string;
  leadId: string;
  /** מרענן את המסכים שמציגים את "המשימה הבאה" של הליד */
  onChanged: () => void;
}) {
  const fetchTasks = useServerFn(adminListLeadTasks);
  const saveTask = useServerFn(adminSaveLeadTask);
  const setStatus = useServerFn(adminSetTaskStatus);
  const removeTask = useServerFn(adminDeleteLeadTask);

  const tasks = useQuery({
    queryKey: ["admin-lead-tasks", siteId, leadId],
    queryFn: () => fetchTasks({ data: { siteId, leadId } }),
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("שיחה");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [showDone, setShowDone] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await tasks.refetch();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const addPreset = (preset: (typeof TASK_PRESETS)[number]) =>
    run(() =>
      saveTask({
        data: {
          siteId,
          task: {
            leadId,
            title: preset.title,
            kind: preset.kind,
            dueAt: inHoursIso(preset.inHours),
            notes: null,
            status: "פתוחה",
            assignedUserId: null,
          },
        },
      }),
    );

  const addCustom = () =>
    run(async () => {
      await saveTask({
        data: {
          siteId,
          task: {
            leadId,
            title: title.trim(),
            kind,
            dueAt: localInputToIso(dueAt),
            notes: notes.trim() || null,
            status: "פתוחה",
            assignedUserId: null,
          },
        },
      });
      setTitle("");
      setNotes("");
      setDueAt("");
      setAdding(false);
    });

  const rows = tasks.data ?? [];
  const open = rows.filter((t) => t.status === "פתוחה");
  const closed = rows.filter((t) => t.status !== "פתוחה");

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
          <ListTodo className="size-4 text-sun" aria-hidden="true" />
          משימות ({open.length} פתוחות)
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          משימה חדשה
        </button>
      </div>

      {err && (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {err}
        </p>
      )}

      {/* משימות מוכנות — הפעולות שחוזרות בכל ליד, בלחיצה אחת */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TASK_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={busy}
            onClick={() => void addPreset(p)}
            className="rounded-full border border-sun/60 px-3 py-1 text-xs font-bold text-primary disabled:opacity-50"
          >
            + {p.title}
          </button>
        ))}
      </div>

      {adding && (
        <div className="mt-3 grid gap-2 rounded-xl bg-secondary/60 p-2 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              מה צריך לעשות *
            </span>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: לשלוח שלושה נכסים בעיר ימים"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סוג</span>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
              {TASK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              מועד יעד (לתזכורת)
            </span>
            <input
              type="datetime-local"
              className="field"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">הערות</span>
            <textarea
              className="field min-h-16"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void addCustom()}
              className="rounded-xl bg-sun px-4 py-1.5 text-xs font-bold text-sun-foreground disabled:opacity-50"
            >
              הוספת המשימה
            </button>
          </div>
        </div>
      )}

      {tasks.isLoading && <p className="mt-2 text-xs text-muted-foreground">טוען…</p>}

      {!tasks.isLoading && open.length === 0 && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          אין משימות פתוחות. משימה עם מועד יעד שולחת תזכורת אוטומטית כשהמועד מגיע.
        </p>
      )}

      {open.length > 0 && (
        <ul className="mt-2 grid gap-1.5">
          {open.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              busy={busy}
              onToggle={(next) =>
                void run(() => setStatus({ data: { siteId, taskId: t.id, status: next } }))
              }
              onDelete={() => {
                if (!confirm("למחוק את המשימה?")) return;
                void run(() => removeTask({ data: { siteId, taskId: t.id } }));
              }}
            />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="mt-2 text-xs font-bold text-primary underline"
          >
            {showDone ? "הסתרת" : "הצגת"} משימות שהסתיימו ({closed.length})
          </button>
          {showDone && (
            <ul className="mt-2 grid gap-1.5">
              {closed.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  busy={busy}
                  onToggle={(next) =>
                    void run(() => setStatus({ data: { siteId, taskId: t.id, status: next } }))
                  }
                  onDelete={() => {
                    if (!confirm("למחוק את המשימה?")) return;
                    void run(() => removeTask({ data: { siteId, taskId: t.id } }));
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
