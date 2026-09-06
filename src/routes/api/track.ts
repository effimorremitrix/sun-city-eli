import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";

/**
 * ============================================================
 * נקודת האיסוף של המדידה העצמית: POST בלבד, כתיבה עם service role.
 *
 * הגנות: קיצוץ אורכים, רשימת סוגי אירועים סגורה (נאכפת גם ב-CHECK במסד),
 * מגבלת קצב לפי IP, ו-hash של מזהה הסשן עם מלח — המזהה הגולמי מהדפדפן
 * לעולם לא נשמר. תשובה תמיד 204: כשל מדידה לא מדווח לדפדפן.
 * ============================================================
 */

const EVENT_TYPES = new Set([
  "whatsapp_click",
  "phone_click",
  "property_view",
  "lead_submit",
  "login",
  "search",
  "signup",
]);

/** מגבלת קצב פשוטה בזיכרון: עד 120 רשומות לדקה לכל IP */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function allow(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 120;
}

const str = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v) ? v : null);

function hashSession(raw: string): string {
  const salt = process.env["ANALYTICS_SALT"] || "sun-city-analytics";
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const done = new Response(null, { status: 204 });
        try {
          // ב-Cloudflare ה-IP האמיתי בכותרת cf-connecting-ip; x-forwarded-for ניתן לזיוף
          const ip =
            request.headers.get("cf-connecting-ip")?.trim() ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown";
          if (!allow(ip)) return done;

          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body) return done;

          const sessionRaw = str(body["sessionId"], 60);
          if (!sessionRaw) return done;
          const session_hash = hashSession(sessionRaw);
          const site_id = uuid(body["siteId"]);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (body["kind"] === "page_view") {
            const path = str(body["path"], 300);
            if (!path || !path.startsWith("/")) return done;
            await supabaseAdmin.from("page_views").insert({
              site_id,
              path,
              referrer: str(body["referrer"], 300),
              utm_source: str(body["utmSource"], 80),
              utm_campaign: str(body["utmCampaign"], 80),
              session_hash,
              lang: str(body["lang"], 8),
              device: str(body["device"], 16),
              is_new_session: body["isNewSession"] === true,
            });
            return done;
          }

          if (body["kind"] === "event") {
            const type = str(body["type"], 30);
            if (!type || !EVENT_TYPES.has(type)) return done;
            await supabaseAdmin.from("track_events").insert({
              site_id,
              type,
              listing_id: uuid(body["listingId"]),
              path: str(body["path"], 300),
              session_hash,
            });
            return done;
          }

          return done;
        } catch (e) {
          console.error("track failed", e instanceof Error ? e.message : e);
          return done;
        }
      },
    },
  },
});
