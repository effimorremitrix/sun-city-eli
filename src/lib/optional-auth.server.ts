import { getRequest } from "@tanstack/react-start/server";

/**
 * זיהוי משתמש אופציונלי לפונקציות שרת ציבוריות: מחזיר את מזהה המשתמש
 * אם הבקשה הגיעה עם טוקן תקין, אחרת null — בלי לזרוק שגיאה.
 * (attachSupabaseAuth מצרף את הטוקן לכל קריאת server fn כשמחוברים.)
 */
export async function getOptionalUserId(): Promise<string | null> {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) return null;

  try {
    const { publicDb } = await import("@/lib/public-db.server");
    const db = publicDb();
    if (!db) return null;
    const { data, error } = await db.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub;
  } catch {
    return null;
  }
}
