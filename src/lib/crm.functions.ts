import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isLostReason,
  isTaskKind,
  isTaskStatus,
  type LeadTask,
  type PipelineBoard,
} from "@/lib/crm";

/**
 * ה-CRM: משימות על ליד, לוח המשימות של הסוכן ולוח הצוות של המנהל.
 * כל הפונקציות עוברות דרך assertSiteAccess / assertManager, ומעליהן RLS
 * לפי owns_site — כך שסוכן רואה את הפייפליין שלו בלבד, ואלי את הכול.
 */

const TASK_COLUMNS =
  "id,lead_id,site_id,assigned_user_id,title,kind,notes,due_at,status,completed_at,created_at,updated_at";

const str = (v: unknown, max = 200): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

const isoOrNull = (v: unknown): string | null => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const uuidOrNull = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
};

/** משימות הליד, הפתוחות לפי מועד ואחריהן שהושלמו */
export const adminListLeadTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; leadId: string }) => ({
    siteId: String(input?.siteId ?? ""),
    leadId: String(input?.leadId ?? ""),
  }))
  .handler(async ({ data, context }): Promise<LeadTask[]> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { data: rows, error } = await context.supabase
      .from("lead_tasks")
      .select(TASK_COLUMNS)
      .eq("site_id", data.siteId)
      .eq("lead_id", data.leadId)
      .order("status", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as LeadTask[];
  });

export type TaskInput = {
  id?: string | null;
  leadId: string;
  title: string;
  kind: string;
  notes: string | null;
  dueAt: string | null;
  status: string;
  assignedUserId: string | null;
};

/**
 * יצירה או עדכון של משימה. המסד מסנכרן אוטומטית את "המשימה הבאה" על הליד
 * (next_follow_up_at / next_action), ולכן כל המסכים הקיימים ממשיכים לעבוד
 * בלי שינוי.
 */
export const adminSaveLeadTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; task: unknown }) => {
    const t = ((input?.task ?? {}) as Record<string, unknown>) || {};
    const title = str(t["title"], 200);
    if (!title) throw new Error("נא להזין כותרת למשימה");
    return {
      siteId: String(input?.siteId ?? ""),
      task: {
        id: uuidOrNull(t["id"]),
        leadId: String(t["leadId"] ?? ""),
        title,
        kind: isTaskKind(t["kind"]) ? t["kind"] : "אחר",
        notes: str(t["notes"], 1000),
        dueAt: isoOrNull(t["dueAt"]),
        status: isTaskStatus(t["status"]) ? t["status"] : "פתוחה",
        assignedUserId: uuidOrNull(t["assignedUserId"]),
      } satisfies TaskInput,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; id: string }> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { logLeadEvent } = await import("@/lib/leads.server");
    const t = data.task;

    // הליד חייב להיות של אותו דף — שכבת אפליקציה מעל ה-RLS
    const { data: lead, error: leadError } = await context.supabase
      .from("leads")
      .select("id,assigned_user_id")
      .eq("site_id", data.siteId)
      .eq("id", t.leadId)
      .single();
    if (leadError) throw new Error(leadError.message);

    const fields = {
      lead_id: t.leadId,
      site_id: data.siteId,
      title: t.title,
      kind: t.kind,
      notes: t.notes,
      due_at: t.dueAt,
      status: t.status,
      assigned_user_id:
        t.assignedUserId ?? (lead.assigned_user_id as string | null) ?? context.userId,
    };

    if (t.id) {
      const { error } = await context.supabase
        .from("lead_tasks")
        .update({
          ...fields,
          ...(t.status === "הושלמה" ? { completed_by: context.userId } : {}),
        })
        .eq("site_id", data.siteId)
        .eq("id", t.id);
      if (error) throw new Error(error.message);
      if (t.status === "הושלמה") {
        await logLeadEvent(context.supabase, {
          leadId: t.leadId,
          siteId: data.siteId,
          eventType: "task_done",
          note: `משימה הושלמה: ${t.title}`,
          actorUserId: context.userId,
        });
      }
      return { ok: true, id: t.id };
    }

    const { data: row, error } = await context.supabase
      .from("lead_tasks")
      .insert({ ...fields, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logLeadEvent(context.supabase, {
      leadId: t.leadId,
      siteId: data.siteId,
      eventType: "task_created",
      note: `משימה נוספה: ${t.title}${
        t.dueAt
          ? ` (ל-${new Date(t.dueAt).toLocaleString("he-IL", {
              timeZone: "Asia/Jerusalem",
              dateStyle: "short",
              timeStyle: "short",
            })})`
          : ""
      }`,
      actorUserId: context.userId,
    });
    return { ok: true, id: row.id as string };
  });

/** סימון משימה כהושלמה או ביטולה — הפעולה הנפוצה, בלחיצה אחת */
export const adminSetTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; taskId: string; status: string }) => {
    if (!isTaskStatus(input?.status)) throw new Error("סטטוס משימה לא מוכר");
    return {
      siteId: String(input?.siteId ?? ""),
      taskId: String(input?.taskId ?? ""),
      status: input.status,
    };
  })
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { logLeadEvent } = await import("@/lib/leads.server");

    const { data: task, error: readError } = await context.supabase
      .from("lead_tasks")
      .select("id,lead_id,title,status")
      .eq("site_id", data.siteId)
      .eq("id", data.taskId)
      .single();
    if (readError) throw new Error(readError.message);

    const { error } = await context.supabase
      .from("lead_tasks")
      .update({
        status: data.status,
        completed_by: data.status === "הושלמה" ? context.userId : null,
      })
      .eq("site_id", data.siteId)
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);

    if (data.status !== task.status) {
      await logLeadEvent(context.supabase, {
        leadId: task.lead_id as string,
        siteId: data.siteId,
        eventType: data.status === "הושלמה" ? "task_done" : "note",
        note:
          data.status === "הושלמה" ? `משימה הושלמה: ${task.title}` : `משימה בוטלה: ${task.title}`,
        actorUserId: context.userId,
      });
    }
    return { ok: true };
  });

export const adminDeleteLeadTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; taskId: string }) => ({
    siteId: String(input?.siteId ?? ""),
    taskId: String(input?.taskId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { error } = await context.supabase
      .from("lead_tasks")
      .delete()
      .eq("site_id", data.siteId)
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** משימה + שם הלקוח שלה, לתצוגת "המשימות שלי" */
export type TaskWithLead = LeadTask & {
  lead: { id: string; full_name: string; phone: string | null; status: string } | null;
};

/**
 * לוח המשימות של הסוכן: כל המשימות הפתוחות של הדף, מהמאוחרת ביותר באיחור
 * ועד הרחוקה. onlyMine מסנן לפי האחראי — רלוונטי במשרד שבו כמה אנשים
 * עובדים על אותו דף.
 */
export const adminListTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; onlyMine?: boolean; includeDone?: boolean }) => ({
    siteId: String(input?.siteId ?? ""),
    onlyMine: input?.onlyMine === true,
    includeDone: input?.includeDone === true,
  }))
  .handler(async ({ data, context }): Promise<TaskWithLead[]> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);

    let q = context.supabase
      .from("lead_tasks")
      .select(`${TASK_COLUMNS},lead:lead_id(id,full_name,phone,status)`)
      .eq("site_id", data.siteId);
    if (!data.includeDone) q = q.eq("status", "פתוחה");
    if (data.onlyMine) q = q.eq("assigned_user_id", context.userId);

    const { data: rows, error } = await q
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as TaskWithLead[];
  });

/** לוח הצוות (crm_pipeline_board, SECURITY DEFINER; סוכן — הדפים שלו) */
export const adminPipelineBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => {
    const from = new Date(String(input?.from ?? ""));
    const to = new Date(String(input?.to ?? ""));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      throw new Error("טווח תאריכים לא תקין");
    return { from: from.toISOString(), to: to.toISOString() };
  })
  .handler(async ({ data, context }): Promise<PipelineBoard> => {
    const { assertManager } = await import("@/lib/admin.server");
    await assertManager(context);
    const { data: result, error } = await context.supabase.rpc("crm_pipeline_board", {
      p_from: data.from,
      p_to: data.to,
    });
    if (error) throw new Error(error.message);
    return result as unknown as PipelineBoard;
  });

export type AssignableUser = { id: string; name: string; email: string | null; isOwner: boolean };

/** מי אפשר להציב כאחראי על ליד בדף הזה: בעל הדף וכל מנהל ראשי */
export const adminAssignableUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string }) => ({ siteId: String(input?.siteId ?? "") }))
  .handler(async ({ data, context }): Promise<AssignableUser[]> => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { data: result, error } = await context.supabase.rpc("assignable_site_users", {
      p_site_id: data.siteId,
    });
    if (error) throw new Error(error.message);
    return (result ?? []) as unknown as AssignableUser[];
  });

/**
 * עדכון שדות הפייפליין של הליד: אחראי, ערך עסקה וסיבת אובדן. מופרד
 * מ-adminSaveLead כדי שכל שינוי כאן יירשם בציר הזמן כאירוע נפרד ויהיה
 * ברור בדוחות מי החליט מה ומתי.
 */
export const adminSetLeadPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      siteId: string;
      leadId: string;
      assignedUserId?: string | null;
      dealValue?: number | string | null;
      lostReason?: string | null;
    }) => {
      const raw = input?.dealValue;
      const n = raw == null || raw === "" ? null : Number(raw);
      if (n != null && (!Number.isFinite(n) || n < 0 || n > 1_000_000_000)) {
        throw new Error("ערך עסקה לא תקין");
      }
      return {
        siteId: String(input?.siteId ?? ""),
        leadId: String(input?.leadId ?? ""),
        assignedUserId: uuidOrNull(input?.assignedUserId),
        dealValue: n == null ? null : Math.round(n),
        lostReason: isLostReason(input?.lostReason) ? input.lostReason : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { logLeadEvent } = await import("@/lib/leads.server");

    const { data: existing, error: readError } = await context.supabase
      .from("leads")
      .select("id,assigned_user_id,deal_value,lost_reason,status")
      .eq("site_id", data.siteId)
      .eq("id", data.leadId)
      .single();
    if (readError) throw new Error(readError.message);

    const { error } = await context.supabase
      .from("leads")
      .update({
        assigned_user_id: data.assignedUserId,
        deal_value: data.dealValue,
        lost_reason: data.lostReason,
      })
      .eq("site_id", data.siteId)
      .eq("id", data.leadId);
    if (error) throw new Error(error.message);

    if (data.assignedUserId !== (existing.assigned_user_id as string | null)) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name,email")
        .eq("id", data.assignedUserId ?? "")
        .maybeSingle();
      const who =
        (profile?.full_name as string | null) || (profile?.email as string | null) || "ללא אחראי";
      await logLeadEvent(context.supabase, {
        leadId: data.leadId,
        siteId: data.siteId,
        eventType: "assigned",
        note: `האחריות על הליד עודכנה: ${who}`,
        actorUserId: context.userId,
      });
      // המשימות הפתוחות עוברות לאחראי החדש יחד עם הליד
      if (data.assignedUserId) {
        await context.supabase
          .from("lead_tasks")
          .update({ assigned_user_id: data.assignedUserId })
          .eq("site_id", data.siteId)
          .eq("lead_id", data.leadId)
          .eq("status", "פתוחה");
      }
    }

    if (data.lostReason && data.lostReason !== (existing.lost_reason as string | null)) {
      await logLeadEvent(context.supabase, {
        leadId: data.leadId,
        siteId: data.siteId,
        eventType: "note",
        note: `סיבת אובדן: ${data.lostReason}`,
        actorUserId: context.userId,
      });
    }

    return { ok: true };
  });
