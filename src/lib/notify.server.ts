import { sendNotificationEmail, newListingEmailHtml } from "@/lib/email.server";
import { sendWhatsAppTemplate } from "@/lib/whatsapp.server";
import { formatClientList } from "@/lib/whatsapp-templates";
import { OFFICE_SLUG } from "@/lib/site-data";

type MinimalListing = {
  id: string;
  title: string;
  neighborhood: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  description: string | null;
};

export type NotifiedClient = {
  name: string | null;
  email: string | null;
  whatsappPhone: string | null;
  profileLabel: string;
};

const fmtPrice = (v: number | null) => (v == null ? "אין מידע" : `${v.toLocaleString("he-IL")} ₪`);

/** פרטי הנכס כפרמטרים לתבנית וואטסאפ — משותף לשלוש התבניות */
function listingParams(l: MinimalListing) {
  return {
    title: l.title,
    neighborhood: l.neighborhood,
    rooms: l.rooms,
    sizeSqm: l.size_sqm,
    price: fmtPrice(l.price),
  };
}

/**
 * שולח את ההתראות שנוצרו לנכס וטרם נשלחו — במייל ובוואטסאפ (לפי העדפת הלקוח).
 * הודעת הוואטסאפ כוללת את פרטי הנכס הכלליים ולינק ליצירת קשר עם הסוכן המפרסם.
 * דורש הרשאות שרת (service role) לקריאת המייל של המשתמש.
 */
export async function sendPendingListingNotifications(
  listing: MinimalListing,
  siteUrl: string,
  agent: { name: string; phoneTel: string | null } | null = null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("listing_notifications")
    .select(
      "id, user_id, search_profile_id, email_sent_at, whatsapp_sent_at, profiles:user_id(email, full_name), search_profiles:search_profile_id(label, notify_email, notify_whatsapp, whatsapp_phone)",
    )
    .eq("listing_id", listing.id)
    .or("email_sent_at.is.null,whatsapp_sent_at.is.null");

  if (error || !rows?.length) {
    return { sent: 0, pending: 0, waSent: 0, waPending: 0, recipients: [] as NotifiedClient[] };
  }

  let sent = 0;
  let pending = 0;
  let waSent = 0;
  let waPending = 0;
  const recipients: NotifiedClient[] = [];

  // פרמטר בתבנית לא יכול להיות ריק, ולכן גם כשאין טלפון לסוכן יש נוסח חלופי
  const agentContact = agent?.phoneTel
    ? `${agent.name}: https://wa.me/${agent.phoneTel.replace(/\D/g, "")}`
    : "צרו קשר דרך האתר";

  for (const row of rows as unknown as Array<{
    id: string;
    email_sent_at: string | null;
    whatsapp_sent_at: string | null;
    profiles: { email: string | null; full_name: string | null } | null;
    search_profiles: {
      label: string;
      notify_email: boolean;
      notify_whatsapp: boolean;
      whatsapp_phone: string | null;
    } | null;
  }>) {
    const email = row.profiles?.email;
    const sp = row.search_profiles;
    const stamps: { email_sent_at?: string; whatsapp_sent_at?: string } = {};

    // מייל
    if (!row.email_sent_at && email && sp?.notify_email !== false) {
      const result = await sendNotificationEmail({
        to: email,
        subject: `נכס חדש שמתאים לך: ${listing.title}`,
        html: newListingEmailHtml({
          ...listing,
          siteUrl,
          profileLabel: sp?.label ?? "פרופיל חיפוש",
        }),
      });
      if (result.sent) {
        stamps.email_sent_at = new Date().toISOString();
        sent += 1;
      } else {
        pending += 1;
      }
    }

    // וואטסאפ — רק ללקוח שביקש וסיפק מספר
    if (!row.whatsapp_sent_at && sp?.notify_whatsapp && sp.whatsapp_phone) {
      const result = await sendWhatsAppTemplate(sp.whatsapp_phone, "new_listing_client", {
        profileLabel: sp.label,
        ...listingParams(listing),
        agentContact,
        siteUrl,
      });
      if (result.sent) {
        stamps.whatsapp_sent_at = new Date().toISOString();
        waSent += 1;
      } else if (result.error) {
        // skipped הוא ה-no-op המתוכנן (אין ספק / אין מזהה תבנית / טלפון לא תקין)
        // ולכן נספר כאן רק כשל אמיתי מול הספק — למשל תבנית שטרם אושרה.
        waPending += 1;
      }
    }

    if (Object.keys(stamps).length) {
      await supabaseAdmin.from("listing_notifications").update(stamps).eq("id", row.id);
    }

    recipients.push({
      name: row.profiles?.full_name ?? null,
      email: email ?? null,
      whatsappPhone: sp?.notify_whatsapp ? (sp.whatsapp_phone ?? null) : null,
      profileLabel: sp?.label ?? "פרופיל חיפוש",
    });
  }

  return { sent, pending, waSent, waPending, recipients };
}

/** תאימות לאחור — הזרימה הישנה של מיילים בלבד */
export async function sendPendingListingEmails(listing: MinimalListing, siteUrl: string) {
  const { sent, pending } = await sendPendingListingNotifications(listing, siteUrl, null);
  return { sent, pending };
}

/**
 * מודיע לסוכן המפרסם (מייל + וואטסאפ) שלקוחות קיבלו התראה על הנכס שלו,
 * כולל פרטי הנכס ופרטי הלקוחות; המנהל הראשי (super admin) מקבל עותק מכולם.
 */
export async function notifyAgentOfMatches(
  listing: MinimalListing,
  siteId: string | null,
  recipients: NotifiedClient[],
  siteUrl: string,
) {
  if (!recipients.length) return { agentNotified: false, superAdminsNotified: 0 };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const clientLines = recipients
    .map(
      (r, i) =>
        `${i + 1}. ${r.name ?? "לקוח/ה"} · ${r.email ?? "ללא מייל"}${r.whatsappPhone ? ` · ${r.whatsappPhone}` : ""} (${r.profileLabel})`,
    )
    .join("\n");

  // רשימת הלקוחות בשורה אחת — פרמטר בתבנית לא יכול להכיל שורות חדשות
  const clientsLine = formatClientList(recipients);

  const bodyHtml = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#FAF8F5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <p style="color:#E8A33D;font-weight:700;margin:0">התראות נשלחו ללקוחות</p>
    <h1 style="color:#1B2A41;font-size:20px;margin:8px 0 4px">${listing.title}</h1>
    <p style="color:#555;margin:0">${listing.neighborhood ?? "אין מידע"} · ${listing.rooms ?? "אין מידע"} חדרים · ${listing.size_sqm ?? "אין מידע"} מ"ר · ${fmtPrice(listing.price)}</p>
    <p style="color:#1B2A41;font-weight:700;margin:16px 0 4px">${recipients.length} לקוחות קיבלו התראה:</p>
    <pre style="color:#333;font-family:inherit;white-space:pre-wrap;margin:0">${clientLines}</pre>
    <a href="${siteUrl}" style="display:inline-block;margin-top:16px;background:#E8A33D;color:#1B2A41;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">לצפייה באתר</a>
  </div></body></html>`;

  let agentNotified = false;
  let siteName = 'סאן סיטי נדל"ן';

  // הסוכן בעל הנכס — לפי בעלות ה-site
  if (siteId) {
    try {
      const { data: site } = await supabaseAdmin
        .from("sites")
        .select("owner_id, name")
        .eq("id", siteId)
        .maybeSingle();
      siteName = (site?.name as string | null) || siteName;
      const ownerId = site?.owner_id as string | undefined;
      if (ownerId) {
        const [{ data: profile }, { data: content }] = await Promise.all([
          supabaseAdmin.from("profiles").select("email").eq("id", ownerId).maybeSingle(),
          supabaseAdmin.from("site_content").select("business").eq("site_id", siteId).maybeSingle(),
        ]);
        const agentEmail = (profile?.email as string | null) ?? null;
        const business = (content?.business ?? {}) as { phoneTel?: string; phone?: string };
        if (agentEmail) {
          const r = await sendNotificationEmail({
            to: agentEmail,
            subject: `הנכס שלך הותאם ל-${recipients.length} לקוחות: ${listing.title}`,
            html: bodyHtml,
          });
          agentNotified = r.sent;
        }
        const agentPhone = business.phoneTel || business.phone;
        if (agentPhone) {
          const r = await sendWhatsAppTemplate(agentPhone, "agent_matches", {
            clientCount: recipients.length,
            ...listingParams(listing),
            clients: clientsLine,
            siteUrl,
          });
          agentNotified = agentNotified || r.sent;
        }
      }
    } catch (e) {
      console.error("notifyAgentOfMatches agent failed", e instanceof Error ? e.message : e);
    }
  }

  // עותק לכל המנהלים הראשיים (super admin)
  let superAdminsNotified = 0;
  try {
    const { data: superAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const ids = (superAdmins ?? []).map((r) => r.user_id as string);
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", ids);
      for (const p of profiles ?? []) {
        const email = p.email as string | null;
        if (!email) continue;
        const r = await sendNotificationEmail({
          to: email,
          subject: `[עותק מנהל] התראות נשלחו על נכס: ${listing.title}`,
          html: bodyHtml,
        });
        if (r.sent) superAdminsNotified += 1;
      }
      // וואטסאפ למנהל הראשי — למספר המשרד הראשי (אם מוגדר ספק שליחה)
      const { data: mainSite } = await supabaseAdmin
        .from("sites")
        .select("id")
        .eq("slug", OFFICE_SLUG)
        .maybeSingle();
      if (mainSite?.id && mainSite.id !== siteId) {
        const { data: mainContent } = await supabaseAdmin
          .from("site_content")
          .select("business")
          .eq("site_id", mainSite.id)
          .maybeSingle();
        const mainBusiness = (mainContent?.business ?? {}) as { phoneTel?: string; phone?: string };
        const mainPhone = mainBusiness.phoneTel || mainBusiness.phone;
        if (mainPhone) {
          await sendWhatsAppTemplate(mainPhone, "admin_copy", {
            siteName,
            ...listingParams(listing),
            clientCount: recipients.length,
            clients: clientsLine,
            siteUrl,
          });
        }
      }
    }
  } catch (e) {
    console.error("notifyAgentOfMatches admins failed", e instanceof Error ? e.message : e);
  }

  return { agentNotified, superAdminsNotified };
}
