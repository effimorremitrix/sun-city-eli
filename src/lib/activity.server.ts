/**
 * יומן פעילות מערכתי (activity_log): כל שליחה, התאמה, חיפוש, תגובת לקוח,
 * חסימה וריצת מתזמן. לעולם לא זורק — כשל ברישום לא מפיל את הפעולה.
 */

export type ActivityKind =
  "client" | "agent" | "admin" | "notification" | "ai" | "job" | "system" | "security";

export type ActivityChannel = "email" | "whatsapp" | "sms" | "inapp";
export type ActivityStatus = "ok" | "failed" | "skipped" | "blocked";

export type ActivityEvent = {
  kind: ActivityKind;
  event: string;
  status?: ActivityStatus | undefined;
  siteId?: string | null | undefined;
  contactId?: string | null | undefined;
  leadId?: string | null | undefined;
  listingId?: string | null | undefined;
  marketListingId?: string | null | undefined;
  actorUserId?: string | null | undefined;
  channel?: ActivityChannel | null | undefined;
  recipient?: string | null | undefined;
  message?: string | null | undefined;
  error?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
};

/** מיסוך נמען ליומן: 4 ספרות אחרונות של טלפון / התחלה+דומיין של מייל */
export function maskRecipient(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.includes("@")) {
    const [user, domain] = v.split("@");
    return `${(user ?? "").slice(0, 2)}***@${domain ?? ""}`;
  }
  const digits = v.replace(/\D/g, "");
  return digits ? `***${digits.slice(-4)}` : "***";
}

export async function logActivity(e: ActivityEvent): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("activity_log").insert({
      kind: e.kind,
      event: e.event.slice(0, 60),
      status: e.status ?? "ok",
      site_id: e.siteId ?? null,
      contact_id: e.contactId ?? null,
      lead_id: e.leadId ?? null,
      listing_id: e.listingId ?? null,
      market_listing_id: e.marketListingId ?? null,
      actor_user_id: e.actorUserId ?? null,
      channel: e.channel ?? null,
      recipient: e.recipient ? e.recipient.slice(0, 120) : null,
      message: e.message ? e.message.slice(0, 500) : null,
      error: e.error ? String(e.error).slice(0, 500) : null,
      metadata: (e.metadata ?? {}) as never,
    });
    if (error) console.error("logActivity failed", error.message);
  } catch (err) {
    console.error("logActivity failed", err instanceof Error ? err.message : err);
  }
}
