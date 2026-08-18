import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RESERVED_AGENT_SLUGS } from "@/lib/reserved-slugs";
import { OFFICE_SLUG } from "@/lib/site-data";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_agent: boolean;
  agent_slug: string | null;
  profiles_count: number;
  notifications_count: number;
};

export type AdminUserSearchProfile = {
  id: string;
  label: string;
  deal_type: string;
  city: string | null;
  neighborhoods: string[];
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  rooms: number | null;
  max_rooms: number | null;
  street: string | null;
  min_size: number | null;
  needs_mamad: boolean;
  needs_elevator: boolean;
  needs_parking: boolean;
  needs_balcony: boolean;
  notes: string | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
  whatsapp_phone: string | null;
  is_active: boolean;
  created_at: string;
};

/** רשימת כל הנרשמים עם ספירות פרופילי חיפוש והתראות (מנהל ראשי בלבד) */
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: profiles, error },
      { data: roles },
      { data: sp },
      { data: notes },
      { data: sites },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("search_profiles").select("user_id"),
      supabaseAdmin.from("listing_notifications").select("user_id"),
      supabaseAdmin.from("sites").select("owner_id, slug"),
    ]);
    if (error) throw new Error(error.message);

    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const superAdminIds = new Set(
      (roles ?? []).filter((r) => r.role === "super_admin").map((r) => r.user_id),
    );
    const agentIds = new Set((roles ?? []).filter((r) => r.role === "agent").map((r) => r.user_id));
    // אלי מחזיק גם בדפים של סוכנים שטרם קיבלו חשבון, ולכן האתר הראשי מנצח
    const siteByOwner = new Map<string, string>();
    for (const s of sites ?? []) {
      const owner = s.owner_id as string;
      const slug = s.slug as string;
      if (!siteByOwner.has(owner) || slug === OFFICE_SLUG) siteByOwner.set(owner, slug);
    }
    const countBy = (rows: Array<{ user_id: string }> | null) => {
      const map = new Map<string, number>();
      for (const r of rows ?? []) map.set(r.user_id, (map.get(r.user_id) ?? 0) + 1);
      return map;
    };
    const spCount = countBy(sp as Array<{ user_id: string }> | null);
    const noteCount = countBy(notes as Array<{ user_id: string }> | null);

    const users: AdminUserRow[] = (profiles ?? []).map((p) => ({
      id: p.id as string,
      email: (p.email as string | null) ?? null,
      full_name: (p.full_name as string | null) ?? null,
      created_at: p.created_at as string,
      is_admin: adminIds.has(p.id as string),
      is_super_admin: superAdminIds.has(p.id as string),
      is_agent: agentIds.has(p.id as string) || siteByOwner.has(p.id as string),
      agent_slug: siteByOwner.get(p.id as string) ?? null,
      profiles_count: spCount.get(p.id as string) ?? 0,
      notifications_count: noteCount.get(p.id as string) ?? 0,
    }));

    return { users, currentUserId: context.userId, adminCount: adminIds.size };
  });

/** פרופילי החיפוש של משתמש נבחר */
export const adminGetUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);

    const { data: rows, error } = await context.supabase
      .from("search_profiles")
      .select(
        "id, label, deal_type, city, neighborhoods, min_price, max_price, min_rooms, rooms, max_rooms, street, min_size, needs_mamad, needs_elevator, needs_parking, needs_balcony, notes, notify_email, notify_whatsapp, whatsapp_phone, is_active, created_at",
      )
      .eq("user_id", data.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return { profiles: (rows ?? []) as unknown as AdminUserSearchProfile[] };
  });

/** הוספה או הסרה של הרשאת מנהל (מנהל ראשי בלבד) */
export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => ({
    userId: String(input.userId),
    makeAdmin: Boolean(input.makeAdmin),
  }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);

    if (data.userId === context.userId) {
      throw new Error("אי אפשר לשנות את הרשאת הניהול של עצמך");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // לא מסירים הרשאות מהמנהל הראשי, ולא את המנהל האחרון במערכת
    const { data: targetRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if (rolesError) throw new Error(rolesError.message);
    if ((targetRoles ?? []).some((r) => r.role === "super_admin")) {
      throw new Error("אי אפשר להסיר הרשאות מהמנהל הראשי");
    }

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) throw new Error("לא ניתן להסיר את המנהל האחרון במערכת");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

type AgentSiteInput = {
  userId: string;
  slug: string;
  agentName: string;
  roleTitle: string;
  phone: string;
  email: string;
  social: { facebook: string; instagram: string; tiktok: string };
};

function sanitizeAgentSiteInput(input: {
  userId?: string;
  slug: string;
  agentName: string;
  roleTitle?: string;
  phone?: string;
  email?: string;
  social?: { facebook?: string; instagram?: string; tiktok?: string };
}): AgentSiteInput {
  const url = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    if (!/^https:\/\//.test(s) || s.length > 300) {
      throw new Error("קישור לרשת חברתית חייב להתחיל ב-https:// (עד 300 תווים)");
    }
    return s;
  };
  return {
    userId: String(input.userId ?? ""),
    slug: String(input.slug ?? "")
      .trim()
      .toLowerCase(),
    agentName: String(input.agentName ?? "").trim(),
    roleTitle: String(input.roleTitle ?? "").trim(),
    phone: String(input.phone ?? "").trim(),
    email: String(input.email ?? "").trim(),
    social: {
      facebook: url(input.social?.facebook),
      instagram: url(input.social?.instagram),
      tiktok: url(input.social?.tiktok),
    },
  };
}

/** התוכן העסקי של דף סוכן (site_content.business); שדות נוספים נשמרים כמות שהם */
type AgentBusiness = {
  roleTitle?: string;
  photoUrl?: string;
  bio?: string;
  social?: { facebook?: string; instagram?: string; tiktok?: string };
  [key: string]: unknown;
};

/**
 * פרטי הסוכן ל-site_content.business. מיזוג ולא דריסה: מה שכבר קיים בדף
 * (תמונת פרופיל, ביוגרפיה, רשת חברתית שהוזנה) נשמר כשהערך החדש ריק.
 */
function agentBusiness(data: AgentSiteInput, existing: AgentBusiness = {}): AgentBusiness {
  const prev = existing.social ?? {};
  const phoneTel = data.phone.replace(/\D/g, "");
  return {
    ...existing,
    agentName: data.agentName,
    roleTitle: data.roleTitle || existing.roleTitle || 'יועץ/ת נדל"ן',
    ...(data.phone ? { phone: data.phone, phoneTel } : {}),
    ...(data.email ? { email: data.email } : {}),
    photoUrl: existing.photoUrl ?? "",
    bio: existing.bio ?? "",
    social: {
      facebook: data.social.facebook || prev.facebook || "",
      instagram: data.social.instagram || prev.instagram || "",
      tiktok: data.social.tiktok || prev.tiktok || "",
    },
  };
}

/** הליבה המשותפת: תפקיד agent + רשומת site + תוכן ראשוני (כולל socials) */
async function createAgentSiteForUser(data: AgentSiteInput) {
  if (!SLUG_RE.test(data.slug)) {
    throw new Error("כתובת הדף (slug) חייבת להיות באותיות לטיניות קטנות, ספרות ומקפים");
  }
  if (RESERVED_AGENT_SLUGS.has(data.slug)) throw new Error("הכתובת הזו שמורה למערכת");
  if (data.agentName.length < 2) throw new Error("נדרש שם סוכן");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("sites")
    .select("id, owner_id")
    .eq("slug", data.slug)
    .maybeSingle();

  // דף שנזרע מראש ומוחזק בינתיים בידי אדמין — נמסר לסוכן עצמו כשהוא מקבל חשבון
  let adopted: string | null = null;
  if (existing) {
    const ownerId = existing.owner_id as string;
    if (ownerId === data.userId) {
      adopted = existing.id as string;
    } else {
      const { data: ownerRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", ownerId);
      const heldByAdmin = (ownerRoles ?? []).some(
        (r) => r.role === "admin" || r.role === "super_admin",
      );
      if (!heldByAdmin) throw new Error("כבר קיים דף עם הכתובת הזו");
      adopted = existing.id as string;
    }
  }

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: data.userId, role: "agent" }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(roleError.message);

  let siteId: string;
  let previous: AgentBusiness = {};
  let previousTexts: Record<string, unknown> = {};
  if (adopted) {
    const { error: transferError } = await supabaseAdmin
      .from("sites")
      .update({ owner_id: data.userId, name: data.agentName })
      .eq("id", adopted);
    if (transferError) throw new Error(transferError.message);
    siteId = adopted;

    const { data: content } = await supabaseAdmin
      .from("site_content")
      .select("business, texts")
      .eq("site_id", siteId)
      .maybeSingle();
    previous = (content?.business ?? {}) as AgentBusiness;
    previousTexts = (content?.texts ?? {}) as Record<string, unknown>;
  } else {
    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .insert({ slug: data.slug, name: data.agentName, owner_id: data.userId })
      .select("id")
      .single();
    if (siteError) throw new Error(siteError.message);
    siteId = site.id as string;
  }

  // תוכן ראשוני כדי שהדף לא יציג את הפרטים של הסוכן הראשי
  const { error: contentError } = await supabaseAdmin.from("site_content").upsert(
    {
      site_id: siteId,
      business: agentBusiness(data, previous) as never,
      // בדף שנמסר לסוכן שומרים על הטקסטים שכבר הוזנו בו
      texts: {
        ...previousTexts,
        heroTitle: previousTexts["heroTitle"] || `${data.agentName} — נדל"ן בנתניה`,
      } as never,
    },
    { onConflict: "site_id" },
  );
  if (contentError) throw new Error(contentError.message);

  return { siteId, slug: data.slug, adopted: adopted !== null };
}

/**
 * הפיכת משתמש רשום לסוכן: תפקיד agent + אתר אישי (sites) + תוכן ראשוני.
 * הדף האישי יעלה בכתובת /<slug> באותו עיצוב של האתר הראשי. מנהל ראשי בלבד.
 */
export const adminCreateAgentSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      userId: string;
      slug: string;
      agentName: string;
      roleTitle?: string;
      phone?: string;
      email?: string;
      social?: { facebook?: string; instagram?: string; tiktok?: string };
    }) => sanitizeAgentSiteInput(input),
  )
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);

    if (!data.userId) throw new Error("נדרש משתמש");
    const result = await createAgentSiteForUser(data);
    return { ok: true, ...result };
  });

/**
 * הוספת סוכן חדש מאפס לפי מייל: אם המשתמש לא קיים — נוצר חשבון ונשלחת אליו
 * הזמנה במייל להגדרת סיסמה; בכל מקרה מוקם לו דף סוכן אישי. מנהל ראשי בלבד.
 */
export const adminInviteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      slug: string;
      agentName: string;
      roleTitle?: string;
      phone?: string;
      social?: { facebook?: string; instagram?: string; tiktok?: string };
    }) => {
      const data = sanitizeAgentSiteInput(input);
      const email = String(input.email ?? "")
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("נדרש מייל תקין לסוכן");
      return { ...data, email };
    },
  )
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // האם כבר קיים משתמש עם המייל הזה?
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    let userId = (existingProfile?.id as string | undefined) ?? null;
    let invited = false;
    let inviteNote: string | null = null;

    if (!userId) {
      // ניסיון ראשון: הזמנה מובנית של Supabase (דורש SMTP מוגדר בפרויקט)
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
          data: { full_name: data.agentName },
        });

      if (!inviteError && inviteData?.user) {
        userId = inviteData.user.id;
        invited = true;
      } else {
        // חלופה: יצירת המשתמש + לינק איפוס סיסמה שנשלח דרך Resend
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          email_confirm: true,
          user_metadata: { full_name: data.agentName },
        });
        if (createError || !created?.user) {
          throw new Error(createError?.message ?? "יצירת המשתמש נכשלה");
        }
        userId = created.user.id;

        const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: data.email,
        });
        const actionLink = link?.properties?.action_link;
        if (!linkError && actionLink) {
          const { sendNotificationEmail } = await import("@/lib/email.server");
          const result = await sendNotificationEmail({
            to: data.email,
            subject: "הוזמנת כסוכן/ת באתר Sun City",
            html: `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#FAF8F5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <h1 style="color:#1B2A41;font-size:20px;margin:0 0 8px">שלום ${data.agentName},</h1>
    <p style="color:#333;line-height:1.6">הוקם עבורך דף סוכן אישי באתר Sun City. להשלמת ההצטרפות יש להגדיר סיסמה בקישור:</p>
    <a href="${actionLink}" style="display:inline-block;background:#E8A33D;color:#1B2A41;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">הגדרת סיסמה וכניסה</a>
  </div></body></html>`,
          });
          invited = result.sent;
          if (!result.sent) inviteNote = "המשתמש נוצר אך שליחת מייל ההזמנה נכשלה (אין תשתית מייל)";
        } else {
          inviteNote = "המשתמש נוצר אך לא הופק קישור הזמנה — יש לשלוח לו איפוס סיסמה ידנית";
        }
      }

      // profiles נוצר בדרך כלל בטריגר על auth.users; מוודאים שהמייל נשמר
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, email: data.email, full_name: data.agentName }, { onConflict: "id" });
    }

    const result = await createAgentSiteForUser({ ...data, userId });
    return { ok: true, ...result, invited, inviteNote, existingUser: Boolean(existingProfile) };
  });

/** מחיקה מלאה של חשבון משתמש וכל הנתונים שלו */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; confirmEmail: string }) => ({
    userId: String(input.userId),
    confirmEmail: String(input.confirmEmail ?? "")
      .trim()
      .toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin } = await import("@/lib/admin.server");
    await assertSuperAdmin(context);

    if (data.userId === context.userId) throw new Error("אי אפשר למחוק את החשבון של עצמך");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r) => r.role === "super_admin")) {
      throw new Error("אי אפשר למחוק את המנהל הראשי");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    const email = ((profile?.email as string | null) ?? "").trim().toLowerCase();
    if (!email || email !== data.confirmEmail) {
      throw new Error("המייל שהוקלד אינו תואם למשתמש שנבחר");
    }

    // סוכן עם דף אישי: הבעלות עוברת לאדמין המוחק (owner_id הוא ON DELETE RESTRICT),
    // כך שהדף והנכסים שלו נשמרים ומחיקת החשבון לא נכשלת.
    const { error: transferError } = await supabaseAdmin
      .from("sites")
      .update({ owner_id: context.userId })
      .eq("owner_id", data.userId);
    if (transferError) throw new Error(transferError.message);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    return { ok: true };
  });
