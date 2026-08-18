/**
 * שליחת הודעות וואטסאפ — שכבה גנרית עם ספקים מתחלפים לפי משתני סביבה.
 * ללא ספק מוגדר: no-op שקט (כמו דפוס המייל) — ההתראה נשארת באתר ובמייל.
 *
 * ספק ברירת המחדל: Green API (https://green-api.com) — חיבור חד-פעמי של מספר
 * הוואטסאפ של המשרד בסריקת QR, ואז שליחה חופשית לכל מספר.
 * משתני סביבה: WHATSAPP_PROVIDER=greenapi, GREEN_API_ID, GREEN_API_TOKEN
 * (אופציונלי: GREEN_API_BASE_URL לאינסטנסים ייעודיים).
 */

export type WaSendResult = { sent: boolean; skipped?: string; error?: string };

/** נרמול טלפון ישראלי לפורמט בינלאומי (05x-xxxxxxx → 972 5x xxxxxxx) */
export function toE164Il(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0") && digits.length >= 9) return `972${digits.slice(1)}`;
  if (digits.length >= 8 && digits.length <= 10) return `972${digits}`;
  return null;
}

export function whatsappConfigured(): boolean {
  const provider = process.env["WHATSAPP_PROVIDER"];
  if (provider === "greenapi") {
    return Boolean(process.env["GREEN_API_ID"] && process.env["GREEN_API_TOKEN"]);
  }
  return false;
}

/** שליחת הודעת טקסט לוואטסאפ. to — מספר בכל פורמט ישראלי סביר. */
export async function sendWhatsAppMessage(to: string, text: string): Promise<WaSendResult> {
  const provider = process.env["WHATSAPP_PROVIDER"];
  if (!provider) return { sent: false, skipped: "no-whatsapp-provider" };

  const e164 = toE164Il(to);
  if (!e164) return { sent: false, skipped: "invalid-phone" };

  if (provider === "greenapi") {
    const id = process.env["GREEN_API_ID"];
    const token = process.env["GREEN_API_TOKEN"];
    if (!id || !token) return { sent: false, skipped: "missing-green-api-credentials" };
    const base = process.env["GREEN_API_BASE_URL"] ?? "https://api.green-api.com";

    try {
      const res = await fetch(`${base}/waInstance${id}/sendMessage/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: `${e164}@c.us`, message: text.slice(0, 4000) }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("whatsapp send failed", res.status, body.slice(0, 300));
        return { sent: false, error: `status-${res.status}` };
      }
      return { sent: true };
    } catch (e) {
      console.error("whatsapp send error", e instanceof Error ? e.message : e);
      return { sent: false, error: "network" };
    }
  }

  return { sent: false, skipped: `unknown-provider-${provider}` };
}
