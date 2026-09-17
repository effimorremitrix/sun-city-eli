import { AUTO_TRANSLATE_TARGETS } from "@/lib/translate.server";

/**
 * ============================================================
 * השלמת תרגומים לתוכן קיים.
 *
 * הבעיה שזה פותר: התרגום האוטומטי רץ רק בזמן *שמירה* של פריט. תוכן
 * שנוצר לפני שהתרגום האוטומטי נכנס — או שנשמר כשהתרגום נכשל — נשאר בלי
 * תרגום, והוצג בעברית בתוך דף באנגלית/צרפתית/רוסית. זה בדיוק מה שרואים
 * בשטח: נכסים, נכסים שנמכרו, ממליצים ופרטי סוכן שנשארו בעברית.
 *
 * המשימה הזו עוברת על התוכן הקיים ומשלימה רק את מה שחסר או התיישן
 * (autoTranslate משווה חתימות של המקור העברי), בקבוצות מוגבלות בגודלן
 * כדי שריצה אחת תסתיים בזמן ולא תפוצץ את תקציב ה-AI. מה שנשאר מטופל
 * בריצה הבאה — ידנית מטאב "מערכת" או מהמתזמן.
 * ============================================================
 */

export type BackfillSummary = {
  sites: number;
  listings: number;
  sold: number;
  testimonials: number;
  fieldMedia: number;
  /** פריטים שנותרו בלי תרגום מלא אחרי הריצה — הרצה נוספת תמשיך מהם */
  remaining: number;
  errors: string[];
};

/** האם לפריט חסר תרגום באחת משפות היעד (מיוצא לבדיקה) */
export function needsTranslation(translations: unknown, fields: string[]): boolean {
  const tr = (translations ?? {}) as Record<string, Record<string, unknown> | undefined>;
  return AUTO_TRANSLATE_TARGETS.some((lang) => {
    const entry = tr[lang];
    if (!entry) return true;
    return fields.some((f) => {
      const v = entry[f];
      return typeof v !== "string" || !v.trim();
    });
  });
}

/** שדות טקסט לא ריקים בלבד — אין טעם לשלוח מחרוזת ריקה לתרגום */
const textFields = (obj: Record<string, unknown>, keys: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
};

/**
 * מריץ השלמת תרגומים. perTable — כמה פריטים לכל טבלה בריצה אחת.
 * לעולם לא זורק: כשל בטבלה אחת נרשם ולא עוצר את השאר.
 */
export async function runTranslationBackfill(
  opts: { perTable?: number; userId?: string | null } = {},
): Promise<BackfillSummary> {
  const perTable = Math.max(1, Math.min(50, opts.perTable ?? 12));
  const userId = opts.userId ?? null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { autoTranslate } = await import("@/lib/translate.server");
  const summary: BackfillSummary = {
    sites: 0,
    listings: 0,
    sold: 0,
    testimonials: 0,
    fieldMedia: 0,
    remaining: 0,
    errors: [],
  };

  /** תבנית משותפת: טבלה פשוטה עם עמודת translations שטוחה לפי שפה */
  const backfillSimple = async (
    table: "listings" | "sold_properties" | "testimonials" | "field_media",
    fields: string[],
    counter: keyof BackfillSummary,
  ) => {
    try {
      const { data: rows, error } = await supabaseAdmin
        .from(table)
        .select(`id, translations, ${fields.join(", ")}`)
        .limit(500);
      if (error) throw new Error(error.message);
      const pending = ((rows ?? []) as unknown as Array<Record<string, unknown>>).filter((r) =>
        needsTranslation(r["translations"], fields),
      );
      summary.remaining += Math.max(0, pending.length - perTable);
      for (const row of pending.slice(0, perTable)) {
        const source = textFields(row, fields);
        if (!Object.keys(source).length) continue;
        const translations = await autoTranslate(
          source,
          (row["translations"] ?? undefined) as never,
          userId,
        );
        const { error: upErr } = await supabaseAdmin
          .from(table)
          .update({ translations: translations as never })
          .eq("id", row["id"] as string);
        if (upErr) throw new Error(upErr.message);
        (summary[counter] as number) += 1;
      }
    } catch (e) {
      summary.errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ---- תוכן הדפים: אודות ותפקיד הסוכן, כותרות ושאלות נפוצות ----
  try {
    const {
      flattenTranslatedFields,
      nestTranslatedFields,
      AUTO_TRANSLATE_TARGETS: targets,
    } = await import("@/lib/translate.server");
    const { data: contents, error } = await supabaseAdmin
      .from("site_content")
      .select("site_id, business, texts, faq, translations")
      .limit(200);
    if (error) throw new Error(error.message);

    let done = 0;
    for (const row of (contents ?? []) as unknown as Array<Record<string, unknown>>) {
      const business = (row["business"] ?? {}) as Record<string, unknown>;
      const texts = (row["texts"] ?? {}) as Record<string, unknown>;
      const faq = Array.isArray(row["faq"]) ? (row["faq"] as Array<Record<string, unknown>>) : [];

      const source: Record<string, string> = {};
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      if (str(business["bio"])) source["business.bio"] = str(business["bio"]);
      if (str(business["roleTitle"])) source["business.roleTitle"] = str(business["roleTitle"]);
      if (str(texts["heroTitle"])) source["texts.heroTitle"] = str(texts["heroTitle"]);
      if (str(texts["heroSubtitle"])) source["texts.heroSubtitle"] = str(texts["heroSubtitle"]);
      for (const f of faq) {
        const id = str(f["id"]);
        if (!id) continue;
        if (str(f["q"])) source[`faq.${id}.q`] = str(f["q"]);
        if (str(f["a"])) source[`faq.${id}.a`] = str(f["a"]);
      }
      const keys = Object.keys(source);
      if (!keys.length) continue;

      const merged = ((row["translations"] ?? {}) as Record<string, Record<string, unknown>>) || {};
      const missing = targets.some((lang) =>
        keys.some((k) => {
          const flat = flattenTranslatedFields(merged[lang], [k]);
          return typeof flat[k] !== "string" || !String(flat[k]).trim();
        }),
      );
      if (!missing) continue;
      if (done >= perTable) {
        summary.remaining += 1;
        continue;
      }

      const flatExisting = Object.fromEntries(
        targets.map((lang) => [lang, flattenTranslatedFields(merged[lang], keys)]),
      );
      const auto = await autoTranslate(source, flatExisting as never, userId);
      const next: Record<string, unknown> = { ...merged };
      for (const lang of targets) {
        const nested = nestTranslatedFields(auto[lang]) as Record<string, unknown>;
        const prev = (merged[lang] ?? {}) as Record<string, unknown>;
        // מיזוג עדין: התרגומים הידניים הקיימים נשמרים, ומה שחסר מתמלא
        const prevBusiness = (prev["business"] ?? {}) as Record<string, unknown>;
        const nextBusiness = (nested["business"] ?? {}) as Record<string, unknown>;
        const prevTexts = (prev["texts"] ?? {}) as Record<string, unknown>;
        const nextTexts = (nested["texts"] ?? {}) as Record<string, unknown>;
        next[lang] = {
          ...prev,
          ...nested,
          business: { ...nextBusiness, ...prevBusiness },
          texts: { ...nextTexts, ...prevTexts },
          _hash: { ...((prev["_hash"] ?? {}) as object), ...((nested["_hash"] ?? {}) as object) },
        };
      }
      const { error: upErr } = await supabaseAdmin
        .from("site_content")
        .update({ translations: next as never })
        .eq("site_id", row["site_id"] as string);
      if (upErr) throw new Error(upErr.message);
      summary.sites += 1;
      done += 1;
    }
  } catch (e) {
    summary.errors.push(`site_content: ${e instanceof Error ? e.message : String(e)}`);
  }

  await backfillSimple("listings", ["title", "description"], "listings");
  await backfillSimple("sold_properties", ["address", "note"], "sold");
  await backfillSimple("testimonials", ["name", "type", "quote"], "testimonials");
  await backfillSimple("field_media", ["title", "description"], "fieldMedia");

  return summary;
}
