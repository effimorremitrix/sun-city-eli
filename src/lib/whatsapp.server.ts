/**
 * שליחת הודעות וואטסאפ דרך ה-API הרשמי של WhatsApp Business.
 * ללא ספק מוגדר: no-op שקט (כמו דפוס המייל) — ההתראה נשארת באתר ובמייל.
 *
 * שני ספקים נתמכים, לבחירה במשתנה WHATSAPP_PROVIDER:
 * - greenapi-waba — אינסטנס מסוג WABA ב-green-api.com (לא האינסטנס עם ה-QR)
 * - meta          — Meta WhatsApp Cloud API ישירות מול graph.facebook.com
 *
 * שליחה יזומה בערוץ הרשמי מותרת אך ורק בתבנית מאושרת מראש, ולכן כל השליחה
 * כאן היא sendWhatsAppTemplate; אין שליחת טקסט חופשי. הנוסחים וסדר הפרמטרים
 * מוגדרים ב-whatsapp-templates.ts.
 *
 * משתני סביבה — ראו README.
 */

import {
  WA_TEMPLATES,
  buildParams,
  type WaTemplateKey,
  type WaTemplateValues,
} from "@/lib/whatsapp-templates";

export type WaProvider = "greenapi-waba" | "meta";

export type WaSendResult = {
  sent: boolean;
  skipped?: string;
  error?: string;
  messageId?: string;
};

export type WaTemplateInfo = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
};

/**
 * גרסת Graph לשליחה במטא. מכוון גבוה יותר מ-facebook.server.ts (v21.0), שמגיע
 * לסוף חיים בסביבות אוקטובר 2026; ניתן לעקוף ב-META_GRAPH_VERSION.
 */
const DEFAULT_GRAPH_VERSION = "v25.0";

const WA_TIMEOUT_MS = 10_000;

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

/** נרמול טלפון ישראלי לפורמט בינלאומי (05x-xxxxxxx → 972 5x xxxxxxx) */
export function toE164Il(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0") && digits.length >= 9) return `972${digits.slice(1)}`;
  if (digits.length >= 8 && digits.length <= 10) return `972${digits}`;
  return null;
}

/** ארבע ספרות אחרונות בלבד — מספרי לקוחות לא נכתבים ללוג במלואם */
function maskPhone(e164: string): string {
  return `***${e164.slice(-4)}`;
}

export function whatsappConfigured(): boolean {
  const provider = env("WHATSAPP_PROVIDER");
  if (provider === "greenapi-waba") {
    return Boolean(env("GREEN_API_ID") && env("GREEN_API_TOKEN"));
  }
  if (provider === "meta") {
    return Boolean(env("META_WABA_PHONE_NUMBER_ID") && env("META_WABA_TOKEN"));
  }
  return false;
}

/** fetch עם תקרת זמן — ספק תקוע לא מעכב את לולאת ההתראות ללא הגבלה */
async function waFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WA_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function graphBase(): string {
  return `https://graph.facebook.com/${env("META_GRAPH_VERSION") ?? DEFAULT_GRAPH_VERSION}`;
}

function greenApiBase(): string {
  return env("GREEN_API_BASE_URL") ?? "https://api.green-api.com";
}

/* ------------------------------ שליחה ------------------------------ */

async function sendViaGreenApiWaba(
  e164: string,
  templateId: string,
  params: string[],
): Promise<WaSendResult> {
  const id = env("GREEN_API_ID");
  const token = env("GREEN_API_TOKEN");
  if (!id || !token) return { sent: false, skipped: "missing-green-api-credentials" };

  const res = await waFetch(`${greenApiBase()}/waInstance${id}/sendTemplate/${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chatId: `${e164}@c.us`, templateId, params }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("whatsapp send failed", "greenapi-waba", res.status, body.slice(0, 300));
    return { sent: false, error: `status-${res.status}` };
  }

  const json = (await res.json().catch(() => null)) as { idMessage?: string } | null;
  if (!json?.idMessage) {
    console.error("whatsapp send failed", "greenapi-waba", "no idMessage in response");
    return { sent: false, error: "bad-response" };
  }
  return { sent: true, messageId: json.idMessage };
}

async function sendViaMeta(
  e164: string,
  templateName: string,
  language: string,
  params: string[],
): Promise<WaSendResult> {
  const phoneNumberId = env("META_WABA_PHONE_NUMBER_ID");
  const token = env("META_WABA_TOKEN");
  if (!phoneNumberId || !token) return { sent: false, skipped: "missing-meta-waba-credentials" };

  const res = await waFetch(`${graphBase()}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: e164,
      type: "template",
      template: {
        name: templateName,
        language: { code: env("WA_TEMPLATE_LANG") ?? language },
        components: params.length
          ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
          : [],
      },
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number; fbtrace_id?: string };
  } | null;

  if (!res.ok) {
    // קודי השגיאה של מטא הם כל האבחון: 132001 תבנית לא נמצאה, 132000 מספר
    // פרמטרים לא תואם, 190 טוקן פג, 131049 מכסת תבניות שיווקיות (חולף מעצמו).
    const code = json?.error?.code;
    console.error(
      "whatsapp send failed",
      "meta",
      res.status,
      code ?? "",
      json?.error?.message ?? "",
      json?.error?.fbtrace_id ?? "",
    );
    return { sent: false, error: `meta-${code ?? res.status}` };
  }

  const messageId = json?.messages?.[0]?.id;
  if (!messageId) {
    console.error("whatsapp send failed", "meta", "no message id in response");
    return { sent: false, error: "bad-response" };
  }
  return { sent: true, messageId };
}

/**
 * שליחת תבנית מאושרת. to — מספר בכל פורמט ישראלי סביר.
 * לעולם לא זורק: לולאת ההתראות ב-notify.server.ts אינה עטופה ב-try/catch,
 * וחריגה כאן הייתה קוטעת את שאר הנמענים.
 */
export async function sendWhatsAppTemplate<K extends WaTemplateKey>(
  to: string,
  key: K,
  values: WaTemplateValues[K],
): Promise<WaSendResult> {
  const provider = env("WHATSAPP_PROVIDER");
  if (!provider) return { sent: false, skipped: "no-whatsapp-provider" };

  // האינסטנס הישן (QR) הוסר — מספר שמחובר כך חשוף לחסימה על ידי מטא
  if (provider === "greenapi") {
    console.warn(
      'ספק וואטסאפ ישן: WHATSAPP_PROVIDER=greenapi כבר אינו נתמך. יש להחליף ל-"greenapi-waba" או ל-"meta".',
    );
    return { sent: false, skipped: "legacy-greenapi-provider" };
  }

  const e164 = toE164Il(to);
  if (!e164) return { sent: false, skipped: "invalid-phone" };

  const spec = WA_TEMPLATES[key];
  const templateId = env(spec.envVar);
  if (!templateId) return { sent: false, skipped: `missing-template-${key}` };

  const params = buildParams(key, values);

  try {
    if (provider === "greenapi-waba") {
      return await sendViaGreenApiWaba(e164, templateId, params);
    }
    if (provider === "meta") {
      return await sendViaMeta(e164, templateId, spec.language, params);
    }
    return { sent: false, skipped: `unknown-provider-${provider}` };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    console.error(
      "whatsapp send error",
      provider,
      key,
      maskPhone(e164),
      e instanceof Error ? e.message : e,
    );
    return { sent: false, error: aborted ? "timeout" : "network" };
  }
}

/* ------------------------------ אבחון ------------------------------ */

/**
 * רשימת התבניות אצל הספק ומצב האישור שלהן.
 * נחוץ בעיקר ל-GREEN-API, שבו המזהה לשליחה הוא UUID שלא מופיע בשום מקום
 * להעתקה בקונסולה. במטא המזהה הוא שם התבנית, ולכן id === name.
 */
export async function listWhatsAppTemplates(): Promise<WaTemplateInfo[]> {
  const provider = env("WHATSAPP_PROVIDER");

  if (provider === "greenapi-waba") {
    const id = env("GREEN_API_ID");
    const token = env("GREEN_API_TOKEN");
    if (!id || !token) return [];
    const res = await waFetch(`${greenApiBase()}/waInstance${id}/getTemplates/${token}`, {
      method: "GET",
    });
    if (!res.ok) {
      console.error("whatsapp getTemplates failed", "greenapi-waba", res.status);
      return [];
    }
    const json = (await res.json().catch(() => null)) as {
      templates?: Array<{
        templateId?: string;
        elementName?: string;
        languageCode?: string;
        status?: string;
        category?: string;
      }>;
    } | null;
    return (json?.templates ?? []).map((t) => ({
      id: t.templateId ?? "",
      name: t.elementName ?? "",
      language: t.languageCode ?? "",
      status: t.status ?? "",
      category: t.category ?? "",
    }));
  }

  if (provider === "meta") {
    const wabaId = env("META_WABA_ID");
    const token = env("META_WABA_TOKEN");
    if (!wabaId || !token) return [];
    const res = await waFetch(
      `${graphBase()}/${wabaId}/message_templates?fields=name,status,language,category&limit=100`,
      { method: "GET", headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      console.error("whatsapp message_templates failed", "meta", res.status);
      return [];
    }
    const json = (await res.json().catch(() => null)) as {
      data?: Array<{ name?: string; status?: string; language?: string; category?: string }>;
    } | null;
    return (json?.data ?? []).map((t) => ({
      id: t.name ?? "",
      name: t.name ?? "",
      language: t.language ?? "",
      status: t.status ?? "",
      category: t.category ?? "",
    }));
  }

  return [];
}
