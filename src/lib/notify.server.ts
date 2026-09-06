import { sendNotificationEmail, newListingEmailHtml } from "@/lib/email.server";
import { sendWhatsAppTemplate } from "@/lib/whatsapp.server";
import {
  formatClientList,
  type WaTemplateKey,
  type WaTemplateValues,
} from "@/lib/whatsapp-templates";
import { OFFICE_SLUG } from "@/lib/site-data";
import { logActivity, maskRecipient, type ActivityEvent } from "@/lib/activity.server";

/**
 * ============================================================
 * שכבת ההתראות. כל שליחה (מייל / וואטסאפ) עוברת דרך sendEmailLogged /
 * sendWaLogged ונרשמת ביומן הפעילות עם הצלחה/כשל ושגיאת הספק — כדי
 * ש"למה הסוכן לא קיבל התראה" תהיה שאלה עם תשובה.
 *
 * יעדי התראה: נכס של המשרד (listings) או מודעה מהשוק (market_listings).
 * ============================================================
 */

export type NotifyTarget = {
  kind: "listing" | "market";
  id: string;
  title: string;
  neighborhood: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  description: string | null;
  /** קישור לצפייה באתר שלנו */
  url: string;
  /** מודעה מהשוק: קישור למקור */
  sourceUrl?: string | null;
  sourceSite?: string | null;
  siteId?: string | null;
};

export type NotifiedClient = {
  name: string | null;
  email: string | null;
  whatsappPhone: string | null;
  profileLabel: string;
};

const fmtPrice = (v: number | null) => (v == null ? "אין מידע" : `${v.toLocaleString("he-IL")} ₪`);

function listingParams(l: NotifyTarget) {
  return {
    title: l.title,
    neighborhood: l.neighborhood,
    rooms: l.rooms,
    sizeSqm: l.size_sqm,
    price: fmtPrice(l.price),
  };
}

type LogCtx = Pick<
  ActivityEvent,
  "siteId" | "contactId" | "leadId" | "listingId" | "marketListingId"
> & {
  event: string;
};

/** מייל + רישום ביומן */
export async function sendEmailLogged(
  input: { to: string; subject: string; html: string },
  ctx: LogCtx,
): Promise<{ sent: boolean; reason?: string }> {
  const result = await sendNotificationEmail(input);
  await logActivity({
    kind: "notification",
    event: ctx.event,
    channel: "email",
    status: result.sent ? "ok" : result.reason === "no-email-provider" ? "skipped" : "failed",
    recipient: maskRecipient(input.to),
    message: input.subject,
    error: result.sent ? null : result.reason,
    siteId: ctx.siteId,
    contactId: ctx.contactId,
    leadId: ctx.leadId,
    listingId: ctx.listingId,
    marketListingId: ctx.marketListingId,
  });
  return result;
}

/** וואטסאפ (תבנית) + רישום ביומן */
export async function sendWaLogged<K extends WaTemplateKey>(
  to: string,
  key: K,
  values: WaTemplateValues[K],
  ctx: LogCtx,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  const result = await sendWhatsAppTemplate(to, key, values);
  await logActivity({
    kind: "notification",
    event: ctx.event,
    channel: "whatsapp",
    status: result.sent ? "ok" : result.error ? "failed" : "skipped",
    recipient: maskRecipient(to),
    message: `תבנית ${key}`,
    error: result.sent ? null : (result.error ?? result.skipped ?? null),
    siteId: ctx.siteId,
    contactId: ctx.contactId,
    leadId: ctx.leadId,
    listingId: ctx.listingId,
    marketListingId: ctx.marketListingId,
    metadata: { template: key, messageId: result.messageId ?? null },
  });
  return result;
}

/* ------------------------- ערוצי הסוכן והמנהל ------------------------- */

export type AgentChannels = {
  siteId: string;
  slug: string | null;
  name: string;
  ownerId: string | null;
  email: string | null;
  whatsapp: string | null;
  /** הטלפון שמוצג ללקוחות (wa.me) */
  publicPhone: string | null;
};

/** ערוצי ההתראה של סוכן: sites.notify_* → פרטי הדף → מייל בעל הדף */
export async function agentChannels(siteId: string | null): Promise<AgentChannels | null> {
  if (!siteId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: site }, { data: content }] = await Promise.all([
    supabaseAdmin
      .from("sites")
      .select("id, slug, name, owner_id, notify_email, notify_whatsapp")
      .eq("id", siteId)
      .maybeSingle(),
    supabaseAdmin.from("site_content").select("business").eq("site_id", siteId).maybeSingle(),
  ]);
  if (!site) return null;
  const business = (content?.business ?? {}) as {
    agentName?: string;
    name?: string;
    email?: string;
    phone?: string;
    phoneTel?: string;
  };
  let email = (site.notify_email as string | null) || business.email || null;
  if (!email && site.owner_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", site.owner_id)
      .maybeSingle();
    email = (profile?.email as string | null) ?? null;
  }
  return {
    siteId: site.id as string,
    slug: (site.slug as string | null) ?? null,
    name: business.agentName || business.name || (site.name as string) || "הסוכן",
    ownerId: (site.owner_id as string | null) ?? null,
    email,
    whatsapp:
      (site.notify_whatsapp as string | null) || business.phoneTel || business.phone || null,
    publicPhone: business.phoneTel || business.phone || null,
  };
}

/** מיילים של המנהלים הראשיים + וואטסאפ המשרד */
export async function superAdminChannels(): Promise<{
  emails: string[];
  whatsapp: string | null;
  officeSiteId: string | null;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const emails: string[] = [];
  const { data: superAdmins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin");
  const ids = (superAdmins ?? []).map((r) => r.user_id as string);
  if (ids.length) {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("email").in("id", ids);
    for (const p of profiles ?? []) if (p.email) emails.push(p.email as string);
  }
  const office = await agentChannels(
    ((await supabaseAdmin.from("sites").select("id").eq("slug", OFFICE_SLUG).maybeSingle()).data
      ?.id as string | undefined) ?? null,
  );
  if (office?.email && !emails.includes(office.email)) emails.push(office.email);
  return { emails, whatsapp: office?.whatsapp ?? null, officeSiteId: office?.siteId ?? null };
}

/* ------------------------- התראות ללקוחות ------------------------- */

/**
 * שולח את ההתראות של יעד (נכס/מודעה) שטרם נשלחו — במייל ובוואטסאפ לפי
 * העדפת הלקוח. מחזיר ספירות ואת רשימת הנמענים (להתראת הסוכן).
 */
export async function sendPendingListingNotifications(
  target: NotifyTarget,
  siteUrl: string,
  agent: { name: string; phoneTel: string | null } | null = null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const targetCol = target.kind === "listing" ? "listing_id" : "market_listing_id";

  const { data: rows, error } = await supabaseAdmin
    .from("listing_notifications")
    .select(
      "id, user_id, lead_id, contact_id, search_profile_id, email_sent_at, whatsapp_sent_at, profiles:user_id(email, full_name), search_profiles:search_profile_id(label, notify_email, notify_whatsapp, whatsapp_phone), leads:lead_id(full_name, email, phone, marketing_consent, site_id)",
    )
    .eq(targetCol, target.id)
    .or("email_sent_at.is.null,whatsapp_sent_at.is.null");

  if (error || !rows?.length) {
    return { sent: 0, pending: 0, waSent: 0, waPending: 0, recipients: [] as NotifiedClient[] };
  }

  let sent = 0;
  let pending = 0;
  let waSent = 0;
  let waPending = 0;
  const recipients: NotifiedClient[] = [];

  const agentContact = agent?.phoneTel
    ? `${agent.name}: https://wa.me/${agent.phoneTel.replace(/\D/g, "")}`
    : "צרו קשר דרך האתר";

  const title =
    target.kind === "market" ? `${target.title} (${target.sourceSite ?? "מהשוק"})` : target.title;

  for (const row of rows as unknown as Array<{
    id: string;
    lead_id: string | null;
    contact_id: string | null;
    email_sent_at: string | null;
    whatsapp_sent_at: string | null;
    profiles: { email: string | null; full_name: string | null } | null;
    search_profiles: {
      label: string;
      notify_email: boolean;
      notify_whatsapp: boolean;
      whatsapp_phone: string | null;
    } | null;
    leads: {
      full_name: string | null;
      email: string | null;
      phone: string | null;
      marketing_consent: boolean;
      site_id: string | null;
    } | null;
  }>) {
    const sp = row.search_profiles;
    const isLeadTarget = row.lead_id != null;
    const email = isLeadTarget
      ? row.leads?.marketing_consent
        ? (row.leads?.email ?? null)
        : null
      : (row.profiles?.email ?? null);
    const waPhone = isLeadTarget
      ? row.leads?.marketing_consent
        ? (row.leads?.phone ?? null)
        : null
      : sp?.notify_whatsapp
        ? (sp.whatsapp_phone ?? null)
        : null;
    const profileLabel = isLeadTarget ? "נכס לפי דרישה" : (sp?.label ?? "פרופיל חיפוש");
    const ctx: LogCtx = {
      event: target.kind === "market" ? "market_match_notified" : "listing_match_notified",
      siteId: target.siteId ?? row.leads?.site_id ?? null,
      contactId: row.contact_id,
      leadId: row.lead_id,
      listingId: target.kind === "listing" ? target.id : null,
      marketListingId: target.kind === "market" ? target.id : null,
    };
    const stamps: { email_sent_at?: string; whatsapp_sent_at?: string; error?: string | null } = {};

    if (!row.email_sent_at && email && (isLeadTarget || sp?.notify_email !== false)) {
      const result = await sendEmailLogged(
        {
          to: email,
          subject: `נכס חדש שמתאים לך: ${title}`,
          html: newListingEmailHtml({
            ...target,
            title,
            siteUrl: target.url || siteUrl,
            profileLabel,
            sourceUrl: target.sourceUrl ?? null,
          }),
        },
        ctx,
      );
      if (result.sent) {
        stamps.email_sent_at = new Date().toISOString();
        stamps.error = null;
        sent += 1;
      } else {
        pending += 1;
        if (result.reason && result.reason !== "no-email-provider")
          stamps.error = `email: ${result.reason}`;
      }
    }

    if (!row.whatsapp_sent_at && waPhone) {
      const result = await sendWaLogged(
        waPhone,
        "new_listing_client",
        {
          profileLabel,
          ...listingParams({ ...target, title }),
          agentContact,
          siteUrl: target.url || siteUrl,
        },
        ctx,
      );
      if (result.sent) {
        stamps.whatsapp_sent_at = new Date().toISOString();
        waSent += 1;
      } else if (result.error) {
        waPending += 1;
        stamps.error = `${stamps.error ? `${stamps.error}; ` : ""}whatsapp: ${result.error}`;
      }
    }

    if (Object.keys(stamps).length) {
      await supabaseAdmin.from("listing_notifications").update(stamps).eq("id", row.id);
    }

    recipients.push({
      name: (isLeadTarget ? row.leads?.full_name : row.profiles?.full_name) ?? null,
      email: email ?? null,
      whatsappPhone: waPhone,
      profileLabel,
    });
  }

  return { sent, pending, waSent, waPending, recipients };
}

/** תאימות לאחור */
export async function sendPendingListingEmails(listing: NotifyTarget, siteUrl: string) {
  const { sent, pending } = await sendPendingListingNotifications(listing, siteUrl, null);
  return { sent, pending };
}

/**
 * המשימה "notify-pending": כל ההתראות שנוצרו (התאמות מהשוק / מפרופיל חדש)
 * וטרם נשלחו — מקובצות לפי יעד. מוגבל בכמות כדי שריצה תסתיים בזמן.
 */
export async function sendAllPendingNotifications(siteUrl: string, maxTargets = 40) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("listing_notifications")
    .select("listing_id, market_listing_id")
    .is("email_sent_at", null)
    .is("whatsapp_sent_at", null)
    .is("error", null)
    .gte("created_at", since)
    .limit(500);

  const listingIds = new Set<string>();
  const marketIds = new Set<string>();
  for (const r of rows ?? []) {
    if (r.listing_id) listingIds.add(r.listing_id);
    else if (r.market_listing_id) marketIds.add(r.market_listing_id);
  }

  let targets = 0;
  let sent = 0;
  let waSent = 0;
  const agentSummary = new Map<string, { target: NotifyTarget; recipients: NotifiedClient[] }>();

  for (const id of [...listingIds].slice(0, maxTargets)) {
    const { data: l } = await supabaseAdmin
      .from("listings")
      .select("id, title, neighborhood, price, rooms, size_sqm, description, site_id, is_published")
      .eq("id", id)
      .maybeSingle();
    if (!l || !l.is_published) continue;
    const agent = await agentChannels(l.site_id as string | null);
    const target: NotifyTarget = {
      kind: "listing",
      id: l.id as string,
      title: l.title as string,
      neighborhood: l.neighborhood as string | null,
      price: l.price as number | null,
      rooms: l.rooms as number | null,
      size_sqm: l.size_sqm as number | null,
      description: l.description as string | null,
      url: agent?.slug
        ? `${siteUrl}/${agent.slug}?listing=${l.id}#properties`
        : `${siteUrl}/?listing=${l.id}#properties`,
      siteId: (l.site_id as string | null) ?? null,
    };
    const r = await sendPendingListingNotifications(
      target,
      siteUrl,
      agent ? { name: agent.name, phoneTel: agent.publicPhone } : null,
    );
    targets += 1;
    sent += r.sent;
    waSent += r.waSent;
    if (r.recipients.length)
      agentSummary.set(`listing:${id}`, { target, recipients: r.recipients });
  }

  for (const id of [...marketIds].slice(0, Math.max(0, maxTargets - targets))) {
    const { data: m } = await supabaseAdmin
      .from("market_listings")
      .select(
        "id, title, neighborhood, price, rooms, size_sqm, description, source_url, source_site, is_active, hidden_by_admin",
      )
      .eq("id", id)
      .maybeSingle();
    if (!m || !m.is_active || m.hidden_by_admin) continue;
    const target: NotifyTarget = {
      kind: "market",
      id: m.id as string,
      title: m.title as string,
      neighborhood: m.neighborhood as string | null,
      price: m.price as number | null,
      rooms: m.rooms as number | null,
      size_sqm: m.size_sqm as number | null,
      description: m.description as string | null,
      url: `${siteUrl}/?market=${m.id}#properties`,
      sourceUrl: m.source_url as string,
      sourceSite: (m.source_site as string | null) ?? null,
    };
    const r = await sendPendingListingNotifications(target, siteUrl, null);
    targets += 1;
    sent += r.sent;
    waSent += r.waSent;
  }

  // התראה לסוכן על נכסי המשרד שהותאמו ללקוחות (כמו בפרסום נכס)
  for (const { target, recipients } of agentSummary.values()) {
    try {
      await notifyAgentOfMatches(target, target.siteId ?? null, recipients, siteUrl);
    } catch (e) {
      console.error("notifyAgentOfMatches failed", e instanceof Error ? e.message : e);
    }
  }

  return { targets, sent, waSent };
}

/* ------------------------- התראות לסוכן ------------------------- */

/**
 * מודיע לסוכן המפרסם (מייל + וואטסאפ) שלקוחות קיבלו התראה על הנכס שלו,
 * והמנהל הראשי מקבל עותק.
 */
export async function notifyAgentOfMatches(
  listing: NotifyTarget,
  siteId: string | null,
  recipients: NotifiedClient[],
  siteUrl: string,
) {
  if (!recipients.length) return { agentNotified: false, superAdminsNotified: 0 };

  const clientLines = recipients
    .map(
      (r, i) =>
        `${i + 1}. ${r.name ?? "לקוח/ה"} · ${r.email ?? "ללא מייל"}${r.whatsappPhone ? ` · ${r.whatsappPhone}` : ""} (${r.profileLabel})`,
    )
    .join("\n");
  const clientsLine = formatClientList(recipients);

  const bodyHtml = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#FAF8F5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <p style="color:#E8A33D;font-weight:700;margin:0">התראות נשלחו ללקוחות</p>
    <h1 style="color:#1B2A41;font-size:20px;margin:8px 0 4px">${listing.title}</h1>
    <p style="color:#555;margin:0">${listing.neighborhood ?? "אין מידע"} · ${listing.rooms ?? "אין מידע"} חדרים · ${listing.size_sqm ?? "אין מידע"} מ"ר · ${fmtPrice(listing.price)}</p>
    <p style="color:#1B2A41;font-weight:700;margin:16px 0 4px">${recipients.length} לקוחות קיבלו התראה:</p>
    <pre style="color:#333;font-family:inherit;white-space:pre-wrap;margin:0">${clientLines}</pre>
    <a href="${listing.url || siteUrl}" style="display:inline-block;margin-top:16px;background:#E8A33D;color:#1B2A41;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">לצפייה באתר</a>
  </div></body></html>`;

  const ctx: LogCtx = {
    event: "agent_matches_notified",
    siteId,
    listingId: listing.kind === "listing" ? listing.id : null,
    marketListingId: listing.kind === "market" ? listing.id : null,
  };

  let agentNotified = false;
  const agent = await agentChannels(siteId);
  const siteName = agent?.name ?? 'סאן סיטי נדל"ן';
  if (agent) {
    if (agent.email) {
      const r = await sendEmailLogged(
        {
          to: agent.email,
          subject: `הנכס שלך הותאם ל-${recipients.length} לקוחות: ${listing.title}`,
          html: bodyHtml,
        },
        ctx,
      );
      agentNotified = r.sent;
    }
    if (agent.whatsapp) {
      const r = await sendWaLogged(
        agent.whatsapp,
        "agent_matches",
        {
          clientCount: recipients.length,
          ...listingParams(listing),
          clients: clientsLine,
          siteUrl: listing.url || siteUrl,
        },
        ctx,
      );
      agentNotified = agentNotified || r.sent;
    }
  }

  let superAdminsNotified = 0;
  try {
    const admins = await superAdminChannels();
    for (const email of admins.emails) {
      if (email === agent?.email) continue;
      const r = await sendEmailLogged(
        { to: email, subject: `[עותק מנהל] התראות נשלחו על נכס: ${listing.title}`, html: bodyHtml },
        { ...ctx, event: "admin_copy_matches" },
      );
      if (r.sent) superAdminsNotified += 1;
    }
    if (admins.whatsapp && admins.officeSiteId !== siteId) {
      await sendWaLogged(
        admins.whatsapp,
        "admin_copy",
        {
          siteName,
          ...listingParams(listing),
          clientCount: recipients.length,
          clients: clientsLine,
          siteUrl: listing.url || siteUrl,
        },
        { ...ctx, event: "admin_copy_matches" },
      );
    }
  } catch (e) {
    console.error("notifyAgentOfMatches admins failed", e instanceof Error ? e.message : e);
  }

  return { agentNotified, superAdminsNotified };
}

export type AgentAlert = {
  /** callback = "רוצה שסוכן יחזור אליי", interest = "מעניין אותי", response = תגובה על התראה */
  kind: "callback" | "interest" | "response";
  responseLabel: string;
  siteId: string;
  contactId: string | null;
  leadId: string | null;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  listing: {
    id: string | null;
    marketId: string | null;
    title: string;
    url: string;
    sourceUrl?: string | null;
  } | null;
  /** תקציר קריטריוני החיפוש של הלקוח (שורה אחת) */
  criteriaSummary: string | null;
  siteUrl: string;
};

/**
 * התראה מיידית לסוכן המטפל כשלקוח מבקש חזרה / מתעניין / מגיב על התראה:
 * מייל + וואטסאפ עם שם, טלפון, הנכס, קישור ישיר וקריטריוני החיפוש; עותק
 * למנהל הראשי. כל ניסיון נרשם ביומן.
 */
export async function notifyAgent(alert: AgentAlert): Promise<{ agentNotified: boolean }> {
  const agent = await agentChannels(alert.siteId);
  const leadUrl = `${alert.siteUrl}/account?tab=leads${agent?.slug ? `&site=${agent.slug}` : ""}`;
  const action =
    alert.kind === "callback"
      ? "ביקש שיחזרו אליו"
      : alert.kind === "interest"
        ? 'סימן "מעניין אותי"'
        : `הגיב "${alert.responseLabel}"`;
  const listingTitle = alert.listing?.title ?? "ללא נכס ספציפי";
  const listingUrl = alert.listing?.url ?? alert.siteUrl;

  const html = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#FAF8F5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <p style="color:#E8A33D;font-weight:700;margin:0">לקוח ${action}</p>
    <h1 style="color:#1B2A41;font-size:22px;margin:8px 0 4px">${alert.clientName}</h1>
    <p style="color:#333;margin:0;font-size:16px">${alert.clientPhone ? `📞 <a href="tel:${alert.clientPhone}">${alert.clientPhone}</a>` : "ללא טלפון"}${alert.clientEmail ? ` · ✉️ ${alert.clientEmail}` : ""}</p>
    <p style="color:#1B2A41;font-weight:700;margin:16px 0 4px">הנכס: ${listingTitle}</p>
    ${alert.listing ? `<a href="${listingUrl}" style="color:#1B2A41">לצפייה בנכס</a>${alert.listing.sourceUrl ? ` · <a href="${alert.listing.sourceUrl}" style="color:#555">למודעה המקורית</a>` : ""}` : ""}
    <p style="color:#555;margin:12px 0 0"><strong>מה הלקוח מחפש:</strong> ${alert.criteriaSummary ?? "אין מידע"}</p>
    <a href="${leadUrl}" style="display:inline-block;margin-top:16px;background:#E8A33D;color:#1B2A41;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">לכרטיס הלקוח</a>
    <p style="color:#888;font-size:12px;margin-top:20px">נקבעה משימת Follow-up אוטומטית בכרטיס הליד.</p>
  </div></body></html>`;

  const ctx: LogCtx = {
    event: `agent_${alert.kind}_alert`,
    siteId: alert.siteId,
    contactId: alert.contactId,
    leadId: alert.leadId,
    listingId: alert.listing?.id ?? null,
    marketListingId: alert.listing?.marketId ?? null,
  };
  const waValues: WaTemplateValues["client_callback"] = {
    action,
    clientName: alert.clientName,
    clientPhone: alert.clientPhone,
    title: listingTitle,
    criteria: alert.criteriaSummary,
    listingUrl,
    leadUrl,
  };

  let agentNotified = false;
  if (agent) {
    if (agent.email) {
      const r = await sendEmailLogged(
        {
          to: agent.email,
          subject: `לקוח ${action}: ${alert.clientName}${alert.listing ? ` — ${alert.listing.title}` : ""}`,
          html,
        },
        ctx,
      );
      agentNotified = r.sent;
    }
    if (agent.whatsapp) {
      const r = await sendWaLogged(agent.whatsapp, "client_callback", waValues, ctx);
      agentNotified = agentNotified || r.sent;
    }
    if (!agent.email && !agent.whatsapp) {
      await logActivity({
        ...ctx,
        kind: "notification",
        status: "failed",
        error: "no-agent-channels",
        message: `לסוכן ${agent.name} אין מייל/וואטסאפ להתראות`,
      });
    }
  } else {
    await logActivity({
      ...ctx,
      kind: "notification",
      status: "failed",
      error: "no-site",
      message: "לא נמצא דף סוכן להתראה",
    });
  }

  try {
    const admins = await superAdminChannels();
    for (const email of admins.emails) {
      if (email === agent?.email) continue;
      await sendEmailLogged(
        { to: email, subject: `[עותק מנהל] לקוח ${action}: ${alert.clientName}`, html },
        { ...ctx, event: `admin_copy_${alert.kind}` },
      );
    }
    if (admins.whatsapp && admins.whatsapp !== agent?.whatsapp) {
      await sendWaLogged(admins.whatsapp, "client_callback", waValues, {
        ...ctx,
        event: `admin_copy_${alert.kind}`,
      });
    }
  } catch (e) {
    console.error("notifyAgent admins failed", e instanceof Error ? e.message : e);
  }

  return { agentNotified };
}
