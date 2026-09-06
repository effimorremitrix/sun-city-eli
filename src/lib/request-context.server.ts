import { getRequest } from "@tanstack/react-start/server";
import { RESERVED_AGENT_SLUGS } from "@/lib/reserved-slugs";

/**
 * הקשר הבקשה: כתובת IP, מזהה מכשיר (קוקי HttpOnly שמונפק ב-server.ts)
 * וייחוס מגע ראשון (סוכן + utm/referrer) — הכול נקרא מהבקשה הנוכחית.
 */

export const DEVICE_COOKIE = "sc_did";
export const AGENT_COOKIE = "sc_agent";
export const ATTRIBUTION_COOKIE = "sc_utm";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Attribution = {
  agentSlug: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPath: string | null;
};

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function currentRequest(): Request | null {
  try {
    return getRequest() ?? null;
  } catch {
    return null;
  }
}

/** IP אמיתי: ב-Cloudflare cf-connecting-ip; אחרת ההופ הראשון ב-x-forwarded-for */
export function clientIp(req: Request | null = currentRequest()): string {
  if (!req) return "unknown";
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

export function deviceId(req: Request | null = currentRequest()): string | null {
  if (!req) return null;
  const v = parseCookies(req.headers.get("cookie"))[DEVICE_COOKIE];
  return v && SAFE_ID.test(v) ? v : null;
}

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

/** slug של דף סוכן מתוך נתיב ציבורי: /elad, /en/elad (עם או בלי שפה) */
export function agentSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return null;
  const first = parts[0]!;
  const langs = new Set(["en", "fr", "ru", "he"]);
  const candidate = langs.has(first) ? parts[1] : first;
  if (!candidate || parts.length > (langs.has(first) ? 2 : 1)) return null;
  if (!SLUG_RE.test(candidate) || RESERVED_AGENT_SLUGS.has(candidate)) return null;
  if (candidate.includes(".")) return null;
  return candidate;
}

export function encodeAttribution(a: Partial<Attribution>): string {
  const compact = {
    s: a.utmSource ?? null,
    c: a.utmCampaign ?? null,
    ct: a.utmContent ?? null,
    r: a.referrer ?? null,
    p: a.landingPath ?? null,
  };
  return encodeURIComponent(JSON.stringify(compact));
}

function decodeAttribution(raw: string | undefined): Partial<Attribution> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : null);
    return {
      utmSource: str(o["s"], 80),
      utmCampaign: str(o["c"], 120),
      utmContent: str(o["ct"], 120),
      referrer: str(o["r"], 300),
      landingPath: str(o["p"], 300),
    };
  } catch {
    return {};
  }
}

/** ייחוס מגע ראשון מהקוקיז של הבקשה הנוכחית */
export function attributionFromRequest(req: Request | null = currentRequest()): Attribution {
  const cookies = req ? parseCookies(req.headers.get("cookie")) : {};
  const agent = cookies[AGENT_COOKIE];
  const decoded = decodeAttribution(cookies[ATTRIBUTION_COOKIE]);
  return {
    agentSlug: agent && SLUG_RE.test(agent) && !RESERVED_AGENT_SLUGS.has(agent) ? agent : null,
    utmSource: decoded.utmSource ?? null,
    utmCampaign: decoded.utmCampaign ?? null,
    utmContent: decoded.utmContent ?? null,
    referrer: decoded.referrer ?? null,
    landingPath: decoded.landingPath ?? null,
  };
}

/** מקור תנועה קריא מתוך utm/referrer — אותם דליים כמו בדוח הסטטיסטיקות */
export function sourceLabel(a: Pick<Attribution, "utmSource" | "referrer">): string | null {
  if (a.utmSource) return a.utmSource;
  const r = (a.referrer ?? "").toLowerCase();
  if (!r) return null;
  if (r.includes("facebook") || r.includes("fb.")) return "Facebook";
  if (r.includes("instagram")) return "Instagram";
  if (r.includes("google")) return "Google";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "WhatsApp";
  if (r.includes("tiktok")) return "TikTok";
  return "אחר";
}
