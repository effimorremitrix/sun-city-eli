/**
 * שליחת מייל התראה. עובד רק כשהוגדר דומיין שליחה לפרויקט (RESEND_API_KEY).
 * כשאין תשתית מייל — מחזיר sent=false וההתראה נשארת במרכז ההתראות באתר.
 */
export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"] ?? "onboarding@resend.dev";
  if (!apiKey) return { sent: false, reason: "no-email-provider" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    });
    if (!res.ok) {
      console.error("email send failed", res.status);
      return { sent: false, reason: `status-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("email send error", e instanceof Error ? e.message : e);
    return { sent: false, reason: "network" };
  }
}

/** גוף מייל בעברית על נכס חדש שתואם לפרופיל החיפוש */
export function newListingEmailHtml(l: {
  title: string;
  neighborhood: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  description: string | null;
  siteUrl: string;
  profileLabel: string;
  /** מודעה מהשוק: קישור למקור */
  sourceUrl?: string | null;
}) {
  const price = l.price == null ? "אין מידע" : `${l.price.toLocaleString("he-IL")} ₪`;
  return `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Assistant,Arial,sans-serif;background:#FAF8F5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <p style="color:#E8A33D;font-weight:700;margin:0">נכס חדש שמתאים לך</p>
    <h1 style="color:#1B2A41;font-size:20px;margin:8px 0 4px">${l.title}</h1>
    <p style="color:#555;margin:0">${l.neighborhood ?? "אין מידע"} · ${l.rooms ?? "אין מידע"} חדרים · ${l.size_sqm ?? "אין מידע"} מ"ר</p>
    <p style="color:#1B2A41;font-size:20px;font-weight:800;margin:12px 0">${price}</p>
    <p style="color:#333;line-height:1.6;margin:0 0 16px">${l.description ?? ""}</p>
    <a href="${l.siteUrl}" style="display:inline-block;background:#E8A33D;color:#1B2A41;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">לצפייה בנכס באתר</a>
    ${l.sourceUrl ? `<p style="color:#555;font-size:13px;margin:12px 0 0">נכס מהשוק — <a href="${l.sourceUrl}" style="color:#1B2A41">למודעה המקורית</a>. הפנייה מנותבת לסוכן של סאן סיטי.</p>` : ""}
    <p style="color:#888;font-size:12px;margin-top:20px">התראה זו נשלחה לפי פרופיל החיפוש שלך: ${l.profileLabel}. אפשר לכבות התראות באזור האישי באתר.</p>
  </div></body></html>`;
}
