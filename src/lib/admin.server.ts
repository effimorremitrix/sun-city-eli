import type { ListingInput } from "@/lib/listing-schema";
import { sendPendingListingEmails } from "@/lib/notify.server";

type Ctx = { supabase: any; userId: string };

/** מאמת שהמשתמש הוא ה־ADMIN היחיד של המערכת */
export async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/** שומר נכס, ואם הוא מפורסם — מייצר התראות ושולח מיילים ללקוחות תואמים */
export async function saveListingAndNotify(context: Ctx, input: ListingInput, siteUrl: string) {
  const { id, ...fields } = input;

  let listingId = id ?? null;

  if (listingId) {
    const { error } = await context.supabase.from("listings").update(fields).eq("id", listingId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await context.supabase
      .from("listings")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    listingId = data.id as string;
  }

  let matched = 0;
  let emailsSent = 0;
  let emailsPending = 0;

  if (fields.is_published && listingId) {
    const { data: count, error: matchError } = await context.supabase.rpc("match_listing_to_profiles", {
      p_listing_id: listingId,
    });
    if (matchError) throw new Error(matchError.message);
    matched = Number(count ?? 0);

    const result = await sendPendingListingEmails(
      {
        id: listingId,
        title: fields.title,
        neighborhood: fields.neighborhood,
        price: fields.price,
        rooms: fields.rooms,
        size_sqm: fields.size_sqm,
        description: fields.description,
      },
      `${siteUrl}/#properties`,
    );
    emailsSent = result.sent;
    emailsPending = result.pending;
  }

  return { ok: true, id: listingId, matched, emailsSent, emailsPending };
}
