import { getSettings } from "@/lib/settings.server";
import { logActivity } from "@/lib/activity.server";

/**
 * ============================================================
 * תזכורות Follow-up לסוכן. עמודות ה-Outbox על leads ועל lead_tasks
 * (reminder_email_sent_at / reminder_whatsapp_sent_at) קיימות מזמן ולא
 * נשלח מהן דבר; כאן הן סוף סוף מקבלות שולח.
 *
 * הכלל: תזכורת אחת לכל מועד. הזזת המועד מאפסת את החותמות (טריגר במסד),
 * ולכן דחיית משימה מייצרת תזכורת חדשה, ולא כפילות.
 * ============================================================
 */

export type ReminderSummary = {
  enabled: boolean;
  tasks: number;
  leads: number;
  emails: number;
  whatsapp: number;
  failed: number;
};

type Recipient = { email: string | null; whatsapp: string | null; name: string };

const fmtWhen = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString("he-IL", {
        timeZone: "Asia/Jerusalem",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "ללא מועד";

/**
 * למי נשלחת התזכורת: קודם כול לאחראי האישי (אם יש לו מייל בפרופיל),
 * ואחרת לערוצי ההתראות של הדף. ככה תזכורת על ליד שהועבר לעובד מסוים
 * מגיעה אליו, ולא לתיבה הכללית.
 */
async function reminderRecipient(
  siteId: string,
  assignedUserId: string | null,
): Promise<Recipient | null> {
  const { agentChannels } = await import("@/lib/notify.server");
  const channels = await agentChannels(siteId).catch(() => null);

  if (assignedUserId && assignedUserId !== channels?.ownerId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name,email")
      .eq("id", assignedUserId)
      .maybeSingle();
    const email = (profile?.email as string | null) ?? null;
    if (email) {
      return {
        email,
        // לוואטסאפ אין מספר אישי לעובד במודל הנוכחי — נשאר מספר הדף
        whatsapp: channels?.whatsapp ?? null,
        name: (profile?.full_name as string | null) || channels?.name || "הסוכן",
      };
    }
  }

  if (!channels) return null;
  return { email: channels.email, whatsapp: channels.whatsapp, name: channels.name };
}

function reminderEmail(input: {
  title: string;
  clientName: string;
  phone: string | null;
  dueAt: string | null;
  notes: string | null;
  leadUrl: string;
}): { subject: string; html: string } {
  const subject = `תזכורת: ${input.title} — ${input.clientName}`;
  const rows = [
    `<p style="margin:0 0 6px"><strong>לקוח:</strong> ${input.clientName}</p>`,
    input.phone
      ? `<p style="margin:0 0 6px"><strong>טלפון:</strong> <a href="tel:${input.phone}" dir="ltr">${input.phone}</a> · <a href="https://wa.me/${input.phone.replace(/\D/g, "").replace(/^0/, "972")}">WhatsApp</a></p>`
      : "",
    `<p style="margin:0 0 6px"><strong>מועד:</strong> ${fmtWhen(input.dueAt)}</p>`,
    input.notes ? `<p style="margin:0 0 6px"><strong>הערות:</strong> ${input.notes}</p>` : "",
  ]
    .filter(Boolean)
    .join("");
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#f6f7f9;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
<h2 style="color:#1B2A41;margin:0 0 12px">${input.title}</h2>
${rows}
<p style="margin:18px 0 0"><a href="${input.leadUrl}" style="background:#F2B705;color:#1B2A41;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:12px;display:inline-block">לכרטיס הלקוח</a></p>
<p style="color:#888;font-size:12px;margin:18px 0 0">תזכורת אוטומטית מסאן סיטי נדל"ן. כדי להפסיק תזכורות, כבו אותן בטאב "הגדרות".</p>
</div></body></html>`;
  return { subject, html };
}

/** שולח תזכורת אחת בשני הערוצים ומחזיר מה באמת יצא */
async function sendReminder(input: {
  siteId: string;
  leadId: string;
  assignedUserId: string | null;
  title: string;
  clientName: string;
  phone: string | null;
  dueAt: string | null;
  notes: string | null;
  siteUrl: string;
}): Promise<{ email: boolean; whatsapp: boolean; failed: boolean }> {
  const to = await reminderRecipient(input.siteId, input.assignedUserId);
  if (!to || (!to.email && !to.whatsapp)) {
    await logActivity({
      kind: "notification",
      event: "follow_up_reminder",
      status: "skipped",
      siteId: input.siteId,
      leadId: input.leadId,
      message: `אין ערוץ התראות לדף — ${input.title}`,
    });
    return { email: false, whatsapp: false, failed: false };
  }

  const leadUrl = `${input.siteUrl.replace(/\/$/, "")}/account?tab=leads`;
  let email = false;
  let whatsapp = false;
  let failed = false;

  if (to.email) {
    const { sendEmailLogged } = await import("@/lib/notify.server");
    const body = reminderEmail({
      title: input.title,
      clientName: input.clientName,
      phone: input.phone,
      dueAt: input.dueAt,
      notes: input.notes,
      leadUrl,
    });
    const res = await sendEmailLogged(
      { to: to.email, subject: body.subject, html: body.html },
      { event: "follow_up_reminder", siteId: input.siteId, leadId: input.leadId },
    );
    email = res.sent;
    if (!res.sent && res.reason && res.reason !== "no-email-provider") failed = true;
  }

  if (to.whatsapp) {
    const { sendWaLogged } = await import("@/lib/notify.server");
    const res = await sendWaLogged(
      to.whatsapp,
      "agent_reminder",
      {
        taskTitle: input.title,
        clientName: input.clientName,
        clientPhone: input.phone,
        dueAt: fmtWhen(input.dueAt),
        leadUrl,
      },
      { event: "follow_up_reminder", siteId: input.siteId, leadId: input.leadId },
    );
    whatsapp = res.sent;
    if (res.error) failed = true;
  }

  if (email || whatsapp) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logLeadEvent } = await import("@/lib/leads.server");
    await logLeadEvent(supabaseAdmin, {
      leadId: input.leadId,
      siteId: input.siteId,
      eventType: "reminder_sent",
      note: `נשלחה תזכורת לסוכן: ${input.title}`,
    }).catch((e: unknown) => console.error("reminder event failed", e));
  }

  return { email, whatsapp, failed };
}

type TaskRow = {
  id: string;
  lead_id: string;
  site_id: string;
  assigned_user_id: string | null;
  title: string;
  notes: string | null;
  due_at: string | null;
  lead: { full_name: string; phone: string | null } | null;
};

type LeadRow = {
  id: string;
  site_id: string;
  assigned_user_id: string | null;
  full_name: string;
  phone: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
};

/**
 * הריצה עצמה. משימות קודם, ואחריהן לידים שיש להם Follow-up ידני בלי משימה —
 * ומסמנים את הליד גם כשהתזכורת יצאה על המשימה שלו, כדי שלא תישלח פעמיים
 * על אותו מועד.
 */
export async function sendFollowUpReminders(): Promise<ReminderSummary> {
  const settings = await getSettings();
  const summary: ReminderSummary = {
    enabled: settings.follow_up_reminders_enabled,
    tasks: 0,
    leads: 0,
    emails: 0,
    whatsapp: 0,
    failed: 0,
  };
  if (!settings.follow_up_reminders_enabled) return summary;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();
  const dueBefore = new Date(now + settings.follow_up_reminder_lead_minutes * 60_000).toISOString();
  // תזכורת על מועד ישן מאוד היא רעש: מה שאיחר ביותר מ-3 ימים נשאר במסך
  // "באיחור" ולא נשלח במייל.
  const notBefore = new Date(now - 3 * 24 * 3600_000).toISOString();
  const limit = Math.max(1, Math.min(200, settings.reminders_per_run));

  const stampedLeads = new Set<string>();

  /* ---------- משימות ---------- */
  const { data: tasks, error: taskError } = await supabaseAdmin
    .from("lead_tasks")
    .select("id,lead_id,site_id,assigned_user_id,title,notes,due_at,lead:lead_id(full_name,phone)")
    .eq("status", "פתוחה")
    .is("reminder_email_sent_at", null)
    .not("due_at", "is", null)
    .lte("due_at", dueBefore)
    .gte("due_at", notBefore)
    .order("due_at", { ascending: true })
    .limit(limit);
  if (taskError) throw new Error(taskError.message);

  for (const raw of (tasks ?? []) as unknown as TaskRow[]) {
    const result = await sendReminder({
      siteId: raw.site_id,
      leadId: raw.lead_id,
      assignedUserId: raw.assigned_user_id,
      title: raw.title,
      clientName: raw.lead?.full_name ?? "לקוח",
      phone: raw.lead?.phone ?? null,
      dueAt: raw.due_at,
      notes: raw.notes,
      siteUrl: settings.site_url,
    });
    summary.tasks += 1;
    if (result.email) summary.emails += 1;
    if (result.whatsapp) summary.whatsapp += 1;
    if (result.failed) summary.failed += 1;

    const stamp = new Date().toISOString();
    await supabaseAdmin
      .from("lead_tasks")
      .update({
        reminder_email_sent_at: stamp,
        ...(result.whatsapp ? { reminder_whatsapp_sent_at: stamp } : {}),
      })
      .eq("id", raw.id);
    // הליד משקף את המשימה הקרובה — מסמנים אותו כדי שלא ייספר שוב למטה
    if (!stampedLeads.has(raw.lead_id)) {
      stampedLeads.add(raw.lead_id);
      await supabaseAdmin
        .from("leads")
        .update({ reminder_email_sent_at: stamp })
        .eq("id", raw.lead_id);
    }
  }

  /* ---------- לידים עם Follow-up ידני ---------- */
  const remaining = limit - summary.tasks;
  if (remaining > 0) {
    const { data: leads, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id,site_id,assigned_user_id,full_name,phone,next_action,next_follow_up_at")
      .is("reminder_email_sent_at", null)
      .not("next_follow_up_at", "is", null)
      .lte("next_follow_up_at", dueBefore)
      .gte("next_follow_up_at", notBefore)
      .not("status", "in", '("נסגרה עסקה","לא רלוונטי")')
      .order("next_follow_up_at", { ascending: true })
      .limit(remaining);
    if (leadError) throw new Error(leadError.message);

    for (const lead of (leads ?? []) as unknown as LeadRow[]) {
      if (stampedLeads.has(lead.id)) continue;
      const result = await sendReminder({
        siteId: lead.site_id,
        leadId: lead.id,
        assignedUserId: lead.assigned_user_id,
        title: lead.next_action || "Follow-up עם הלקוח",
        clientName: lead.full_name,
        phone: lead.phone,
        dueAt: lead.next_follow_up_at,
        notes: null,
        siteUrl: settings.site_url,
      });
      summary.leads += 1;
      if (result.email) summary.emails += 1;
      if (result.whatsapp) summary.whatsapp += 1;
      if (result.failed) summary.failed += 1;

      const stamp = new Date().toISOString();
      await supabaseAdmin
        .from("leads")
        .update({
          reminder_email_sent_at: stamp,
          ...(result.whatsapp ? { reminder_whatsapp_sent_at: stamp } : {}),
        })
        .eq("id", lead.id);
    }
  }

  return summary;
}
