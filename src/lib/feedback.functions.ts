import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * ============================================================
 * משוב לקוח על נכסים (❤️ מעניין / ❌ לא מתאים / ⭐ שמור / 📞 שיחזרו אליי).
 *
 * ❤️ ו-📞 גם פותחים/מעדכנים כרטיס ליד אצל הסוכן המטפל, רושמים אירוע בציר
 * הזמן, קובעים משימת Follow-up ושולחים מייל לסוכן — אותה זרימה כמו תגובה
 * על התראה (respondToNotification).
 * ============================================================
 */

const REACTIONS = ["interested", "not_relevant", "favorite", "callback"] as const;
export type FeedbackReaction = (typeof REACTIONS)[number];

/** תוויות בעברית לציר הזמן של הליד ולמייל לסוכן (צד הניהול עברי) */
const REACTION_LABELS: Record<FeedbackReaction, string> = {
  interested: "מעניין אותי",
  not_relevant: "לא מתאים לי",
  favorite: "שמר את הנכס",
  callback: "רוצה שסוכן יחזור אליי",
};

export const setListingFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; reaction: string; on?: boolean }) => {
    const reaction = String(input?.reaction ?? "");
    if (!(REACTIONS as readonly string[]).includes(reaction)) throw new Error("Unknown reaction");
    return {
      listingId: String(input?.listingId ?? ""),
      reaction: reaction as FeedbackReaction,
      on: input?.on !== false,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // הנכס חייב להיות מפורסם ונגיש ללקוח (RLS) — וממנו נגזר הסוכן המטפל
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, site_id, title")
      .eq("id", data.listingId)
      .maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing) throw new Error("הנכס לא נמצא");

    if (!data.on) {
      const { error } = await supabase
        .from("listing_feedback")
        .delete()
        .eq("user_id", userId)
        .eq("listing_id", data.listingId)
        .eq("reaction", data.reaction);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // "מעניין" ו"לא מתאים" סותרים זה את זה — הפעלת אחד מנקה את השני
    const opposite =
      data.reaction === "interested"
        ? "not_relevant"
        : data.reaction === "not_relevant"
          ? "interested"
          : null;
    if (opposite) {
      await supabase
        .from("listing_feedback")
        .delete()
        .eq("user_id", userId)
        .eq("listing_id", data.listingId)
        .eq("reaction", opposite);
    }

    // ❤️ / 📞 — פתיחת/עדכון ליד אצל הסוכן המטפל + התראה מיידית לסוכן
    let leadId: string | null = null;
    let contactId: string | null = null;
    if (data.reaction === "interested" || data.reaction === "callback") {
      try {
        const { findOrCreateLeadForUser, handleClientAction } = await import("@/lib/leads.server");
        const { officeSiteId } = await import("@/lib/contacts.server");
        const { getSettings } = await import("@/lib/settings.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .maybeSingle();

        const pageSite = (listing.site_id as string | null) ?? (await officeSiteId()) ?? "";
        const { lead, contact } = await findOrCreateLeadForUser(pageSite, userId, {
          fullName: (profile?.full_name as string | null) ?? null,
          email: (profile?.email as string | null) ?? null,
          source: "הסוכן האישי",
          listingId: listing.id as string,
          createdNote: `הלקוח סימן "${REACTION_LABELS[data.reaction]}" על הנכס: ${listing.title}`,
        });
        leadId = lead.id;
        contactId = contact.id;

        await handleClientAction({
          kind: data.reaction === "callback" ? "callback" : "interest",
          responseLabel: REACTION_LABELS[data.reaction],
          userId,
          contact,
          lead,
          target: {
            listingId: listing.id as string,
            marketListingId: null,
            title: listing.title as string,
            siteId: (listing.site_id as string | null) ?? null,
          },
          siteUrl: (await getSettings()).site_url,
        });
      } catch (e) {
        // המשוב עצמו נשמר גם אם עדכון הליד נכשל
        console.error("feedback lead sync failed", e instanceof Error ? e.message : e);
      }
    }

    const { error } = await supabase.from("listing_feedback").upsert(
      {
        user_id: userId,
        listing_id: data.listingId,
        site_id: (listing.site_id as string | null) ?? null,
        lead_id: leadId,
        contact_id: contactId,
        reaction: data.reaction,
      },
      { onConflict: "listing_id,user_id,reaction" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** המשוב של לקוחות על נכסים — לתצוגה בכרטיס הליד אצל הסוכן */
export const adminListLeadFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteId: string; leadId: string }) => ({
    siteId: String(input?.siteId ?? ""),
    leadId: String(input?.leadId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/admin.server");
    await assertSiteAccess(context, data.siteId);
    const { data: rows, error } = await context.supabase
      .from("listing_feedback")
      .select("id, reaction, created_at, listing:listing_id(id, title)")
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as Array<{
      id: string;
      reaction: string;
      created_at: string;
      listing: { id: string; title: string } | null;
    }>;
  });
