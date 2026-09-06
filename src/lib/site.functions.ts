import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  mergeLive,
  type LiveContentTranslation,
  type LiveFaqItem,
  type LiveSite,
  type LiveTestimonial,
  type LiveTranslations,
} from "@/lib/site-live";
import { OFFICE_SLUG } from "@/lib/site-data";

/** ברירת המחדל לקריאה ציבורית ולבחירת ה-site בניהול — אתר המשרד */
const PUBLIC_SLUG = OFFICE_SLUG;

/* ------------------------- קריאה ציבורית ------------------------- */

export const getPublicSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { slug?: string | null }) => ({
    slug: (input?.slug ?? PUBLIC_SLUG).trim(),
  }))
  .handler(async ({ data: params }): Promise<LiveSite> => {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return mergeLive(null);

    const { data, error } = await db.rpc("get_public_site", { p_slug: params.slug });
    if (error) {
      console.error("get_public_site failed", error.message);
      return mergeLive(null);
    }
    return mergeLive(data);
  });

/* ------------------- ניהול (אדמין או סוכן בעל אתר) ------------------- */

export const getAdminSite = createServerFn({ method: "GET" })
  .inputValidator((input?: { siteId?: string | null }) => ({ siteId: input?.siteId ?? null }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: params, context }) => {
    const { getManagerAccess } = await import("@/lib/admin.server");
    const access = await getManagerAccess(context);

    if (!access.isAdmin && !access.isAgent) {
      return {
        isAdmin: false,
        isSuperAdmin: false,
        isAgent: false,
        sites: [],
        site: null,
        live: mergeLive(null),
      };
    }

    // בחירת ה-site הפעיל: המבוקש, אחרת הראשי (לאדמין) או הראשון של הסוכן
    const site =
      (params.siteId ? access.sites.filter((s) => s.id === params.siteId)[0] : null) ??
      access.sites.filter((s) => s.slug === PUBLIC_SLUG)[0] ??
      access.sites[0] ??
      null;

    type AdminContent = {
      business: unknown;
      texts: unknown;
      translations: unknown;
      testimonials: unknown;
      faq: unknown;
    };
    let content: AdminContent | null = null;
    if (site) {
      const { data } = await context.supabase
        .from("site_content")
        .select("business, texts, translations, testimonials, faq")
        .eq("site_id", site.id)
        .maybeSingle();
      content = (data ?? null) as AdminContent | null;
    }

    return {
      isAdmin: access.isAdmin,
      isSuperAdmin: access.isSuperAdmin,
      isAgent: access.isAgent,
      sites: access.sites,
      site,
      live: mergeLive(content ? { ...content, id: site?.id, slug: site?.slug } : null),
    };
  });

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      siteId?: string | null;
      business?: Record<string, unknown>;
      texts?: Record<string, unknown>;
      translations?: Record<string, unknown>;
      testimonials?: unknown[] | null;
      faq?: unknown[] | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertManager, assertSiteAccess } = await import("@/lib/admin.server");

    let siteId = data.siteId ?? null;
    if (siteId) {
      await assertSiteAccess(context, siteId);
    } else {
      const access = await assertManager(context);
      const fallback =
        access.sites.filter((s) => s.slug === PUBLIC_SLUG)[0] ?? access.sites[0] ?? null;
      if (!fallback) throw new Error("לא נמצאה רשומת אתר במסד הנתונים");
      siteId = fallback.id;
    }

    // ממליצים ושאלות נפוצות עוברים ולידציה; undefined = לא לגעת בערך הקיים
    let testimonials: unknown;
    let faq: unknown;
    if (data.testimonials !== undefined) {
      const { testimonialSchema } = await import("@/lib/listing-schema");
      testimonials =
        data.testimonials === null
          ? null
          : data.testimonials.slice(0, 30).map((t) => testimonialSchema.parse(t));
    }
    if (data.faq !== undefined) {
      const { faqItemSchema } = await import("@/lib/listing-schema");
      faq = data.faq === null ? null : data.faq.slice(0, 30).map((f) => faqItemSchema.parse(f));
    }

    // תרגום אוטומטי של התוכן שנשמר (ממליצים, שאלות נפוצות, אודות ותפקיד
    // הסוכן) לשלוש שפות האתר — ממוזג לתוך עמודת translations הקיימת
    const translations = await mergeAutoTranslations(context, siteId, data, {
      testimonials: testimonials as LiveTestimonial[] | null | undefined,
      faq: faq as LiveFaqItem[] | null | undefined,
    });

    const { error } = await context.supabase.from("site_content").upsert(
      {
        site_id: siteId,
        ...(data.business !== undefined ? { business: data.business as never } : {}),
        ...(data.texts !== undefined ? { texts: data.texts as never } : {}),
        ...(translations ? { translations: translations as never } : {}),
        ...(data.testimonials !== undefined ? { testimonials: testimonials as never } : {}),
        ...(data.faq !== undefined ? { faq: faq as never } : {}),
      },
      { onConflict: "site_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------- תרגום אוטומטי של תוכן האתר בשמירה ------------------- */

/** המפתחות שהעורך הידני (AdminTranslateTabs בלוח הניהול) שולט בהם במלואם */
const MANUAL_BUSINESS_KEYS = ["name", "tagline", "subtitle", "address", "hours"] as const;

/**
 * בונה את עמודת translations החדשה: התרגומים הידניים שהגיעו מהלוח (אם הגיעו)
 * מחליפים את המפתחות שלהם, ושאר המפתחות — בעיקר אלה שמתורגמים אוטומטית —
 * נשמרים מהרשומה הקיימת ומתעדכנים לפי מה שנשמר עכשיו. מחזיר undefined כשאין
 * מה לעדכן (שמירה שלא נגעה בשום שדה מתורגם).
 */
async function mergeAutoTranslations(
  context: { supabase: SupabaseClient<Database>; userId: string },
  siteId: string,
  data: {
    business?: Record<string, unknown>;
    translations?: Record<string, unknown>;
    testimonials?: unknown[] | null;
    faq?: unknown[] | null;
  },
  parsed: {
    testimonials: LiveTestimonial[] | null | undefined;
    faq: LiveFaqItem[] | null | undefined;
  },
): Promise<LiveTranslations | undefined> {
  const touchesAuto =
    data.business !== undefined || data.testimonials !== undefined || data.faq !== undefined;
  if (!touchesAuto && !data.translations) return undefined;

  // המצב הנוכחי במסד — הבסיס למיזוג ולהשוואת החתימות
  const { data: row } = await context.supabase
    .from("site_content")
    .select("business, testimonials, faq, translations")
    .eq("site_id", siteId)
    .maybeSingle();
  const existing = ((row?.translations ?? {}) as LiveTranslations) || {};

  // שכבה 1: תרגומים ידניים מהלוח מחליפים את המפתחות שבשליטתם
  const merged: LiveTranslations = {};
  const incoming = (data.translations ?? undefined) as LiveTranslations | undefined;
  const locales = new Set([...Object.keys(existing), ...Object.keys(incoming ?? {})]);
  for (const locale of locales) {
    const prev = existing[locale] ?? {};
    const next: LiveContentTranslation = { ...prev };
    if (incoming) {
      const manual = incoming[locale] ?? {};
      if (manual.texts) next.texts = manual.texts;
      else delete next.texts;
      const business: NonNullable<LiveContentTranslation["business"]> = {
        ...(prev.business ?? {}),
      };
      for (const k of MANUAL_BUSINESS_KEYS) delete business[k];
      Object.assign(business, manual.business ?? {});
      next.business = business;
    }
    merged[locale] = next;
  }
  if (!touchesAuto) return merged;

  // שכבה 2: השדות המתורגמים אוטומטית — לפי מה שנשמר עכשיו (או הקיים במסד)
  const business = (data.business ?? (row?.business as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >;
  const testimonials =
    parsed.testimonials !== undefined
      ? parsed.testimonials
      : ((row?.testimonials as LiveTestimonial[] | null) ?? null);
  const faq = parsed.faq !== undefined ? parsed.faq : ((row?.faq as LiveFaqItem[] | null) ?? null);

  const source: Record<string, string> = {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  source["business.bio"] = str(business["bio"]);
  source["business.roleTitle"] = str(business["roleTitle"]);
  for (const t of Array.isArray(testimonials) ? testimonials : []) {
    source[`testimonials.${t.id}.name`] = str(t.name);
    source[`testimonials.${t.id}.type`] = str(t.type);
    source[`testimonials.${t.id}.quote`] = str(t.quote);
  }
  for (const f of Array.isArray(faq) ? faq : []) {
    source[`faq.${f.id}.q`] = str(f.q);
    source[`faq.${f.id}.a`] = str(f.a);
  }
  const keys = Object.keys(source);

  const { autoTranslate, flattenTranslatedFields, nestTranslatedFields, AUTO_TRANSLATE_TARGETS } =
    await import("@/lib/translate.server");
  const flatExisting = Object.fromEntries(
    AUTO_TRANSLATE_TARGETS.map((lang) => [
      lang,
      flattenTranslatedFields(merged[lang] as Record<string, unknown> | undefined, keys),
    ]),
  );
  const auto = await autoTranslate(source, flatExisting, context.userId);

  for (const lang of AUTO_TRANSLATE_TARGETS) {
    const nested = nestTranslatedFields(auto[lang]) as LiveContentTranslation & {
      business?: Record<string, string>;
    };
    const prev = merged[lang] ?? {};
    // המפתחות הידניים נשארים; bio/roleTitle, הממליצים והשאלות מוחלפים במלואם
    // (ממליץ שנמחק — התרגום שלו נמחק איתו)
    const prevBusiness = { ...(prev.business ?? {}) };
    delete prevBusiness.bio;
    delete prevBusiness.roleTitle;
    const entry: LiveContentTranslation = { ...prev };
    delete entry.testimonials;
    delete entry.faq;
    delete entry._hash;
    const business = { ...prevBusiness, ...(nested.business ?? {}) };
    if (Object.keys(business).length) entry.business = business;
    else delete entry.business;
    if (nested.testimonials) entry.testimonials = nested.testimonials;
    if (nested.faq) entry.faq = nested.faq;
    if (nested._hash) entry._hash = nested._hash;
    if (!entry.texts || !Object.keys(entry.texts).length) delete entry.texts;
    merged[lang] = entry;
  }
  return merged;
}

/* ------------------------- הקמת ה־ADMIN הראשון ------------------------- */

export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("קיים כבר מנהל במערכת");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);

    // המנהל הראשון הוא גם המנהל הראשי (super admin)
    const { error: superError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "super_admin" }, { onConflict: "user_id,role" });
    if (superError) throw new Error(superError.message);

    return { ok: true };
  });
