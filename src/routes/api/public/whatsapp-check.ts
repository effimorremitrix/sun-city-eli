import { createFileRoute } from "@tanstack/react-router";
import { WA_TEMPLATES, type WaTemplateKey } from "@/lib/whatsapp-templates";

/**
 * אבחון חיבור הוואטסאפ — מוגן בסוד x-wa-secret (WHATSAPP_DEBUG_SECRET).
 *
 * GET  — איזה ספק מוגדר, אילו מזהי תבניות הוגדרו, ומה מצב האישור שלהן אצל
 *        הספק. זו גם הדרך לגלות את ה-templateId (UUID) של GREEN-API, שלא
 *        מופיע בקונסולה בצורה שניתן להעתיק.
 * POST {"to":"0501234567","key":"new_listing_client"} — שליחת בדיקה אחת עם
 *        ערכי דוגמה, בלי לפרסם נכס אמיתי.
 *
 * הערך של הבדיקה הזו על פני curl ישיר לספק: היא רצה בסביבת הפרודקשן עם
 * משתני הסביבה האמיתיים, ולכן תופסת גם שם משתנה שהוקלד לא נכון בלוח הבקרה.
 * אחרי עלייה לאוויר אפשר למחוק את הקובץ, או פשוט לא להגדיר את הסוד.
 */
export const Route = createFileRoute("/api/public/whatsapp-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = authorize(request);
        if (denied) return denied;

        const { listWhatsAppTemplates, whatsappConfigured } = await import("@/lib/whatsapp.server");

        const templatesEnv: Record<string, string | null> = {};
        for (const [key, spec] of Object.entries(WA_TEMPLATES)) {
          templatesEnv[key] = process.env[spec.envVar] ?? null;
        }

        return Response.json({
          provider: process.env["WHATSAPP_PROVIDER"] ?? null,
          configured: whatsappConfigured(),
          templatesEnv,
          templates: await listWhatsAppTemplates(),
        });
      },

      POST: async ({ request }) => {
        const denied = authorize(request);
        if (denied) return denied;

        const body = (await request.json().catch(() => null)) as {
          to?: string;
          key?: string;
        } | null;

        const to = body?.to;
        const key = body?.key as WaTemplateKey | undefined;
        if (!to || !key || !(key in WA_TEMPLATES)) {
          return Response.json({ error: "to and a valid key are required" }, { status: 400 });
        }

        const { sendWhatsAppTemplate } = await import("@/lib/whatsapp.server");
        // ערכי הדוגמה של התבנית — אותם ערכים שהוגשו לאישור
        const spec = WA_TEMPLATES[key];
        const values: Record<string, string> = {};
        spec.fields.forEach((field, i) => {
          values[String(field)] = spec.samples[i] ?? "בדיקה";
        });

        const result = await sendWhatsAppTemplate(to, key, values as never);
        return Response.json(result);
      },
    },
  },
});

function authorize(request: Request): Response | null {
  const secret = process.env["WHATSAPP_DEBUG_SECRET"];
  if (!secret) return new Response("not configured", { status: 503 });
  const provided = request.headers.get("x-wa-secret") ?? "";
  if (provided.length !== secret.length || provided !== secret) {
    return new Response("unauthorized", { status: 401 });
  }
  return null;
}
