import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** תרגום אוטומטי של שדות תוכן מעברית לשפת יעד — למנהל האתר בלבד */
export const adminTranslateFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fields: Record<string, string>; target: string }) => {
    const target = String(input?.target ?? "");
    const rawFields = input?.fields && typeof input.fields === "object" ? input.fields : {};
    const fields: Record<string, string> = {};
    let total = 0;
    for (const [key, value] of Object.entries(rawFields)) {
      if (typeof value !== "string") continue;
      const text = value.trim();
      if (!text) continue;
      total += text.length;
      fields[key.slice(0, 60)] = text.slice(0, 4000);
    }
    if (!Object.keys(fields).length) throw new Error("אין טקסט לתרגום");
    if (total > 12000) throw new Error("יותר מדי טקסט לתרגום בבת אחת");
    return { fields, target };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context);

    const { translateFields, isTranslateTarget } = await import("@/lib/translate.server");
    if (!isTranslateTarget(data.target)) throw new Error("שפת יעד לא נתמכת");

    const translations = await translateFields(data.fields, data.target, context.userId);
    return { translations };
  });
