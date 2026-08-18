import { sendNotificationEmail, newListingEmailHtml } from "@/lib/email.server";

type MinimalListing = {
  id: string;
  title: string;
  neighborhood: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  description: string | null;
};

/**
 * שולח מיילים להתראות שנוצרו לנכס ועדיין לא נשלחו.
 * דורש הרשאות שרת (service role) לקריאת המייל של המשתמש.
 */
export async function sendPendingListingEmails(listing: MinimalListing, siteUrl: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("listing_notifications")
    .select(
      "id, user_id, search_profile_id, profiles:user_id(email), search_profiles:search_profile_id(label, notify_email)",
    )
    .eq("listing_id", listing.id)
    .is("email_sent_at", null);

  if (error || !rows?.length) return { sent: 0, pending: 0 };

  let sent = 0;
  let pending = 0;

  for (const row of rows as unknown as Array<{
    id: string;
    profiles: { email: string | null } | null;
    search_profiles: { label: string; notify_email: boolean } | null;
  }>) {
    const email = row.profiles?.email;
    if (!email || row.search_profiles?.notify_email === false) continue;

    const result = await sendNotificationEmail({
      to: email,
      subject: `נכס חדש שמתאים לך: ${listing.title}`,
      html: newListingEmailHtml({
        ...listing,
        siteUrl,
        profileLabel: row.search_profiles?.label ?? "פרופיל חיפוש",
      }),
    });

    if (result.sent) {
      await supabaseAdmin
        .from("listing_notifications")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent += 1;
    } else {
      pending += 1;
    }
  }

  return { sent, pending };
}
