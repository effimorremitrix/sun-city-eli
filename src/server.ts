import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  AGENT_COOKIE,
  ATTRIBUTION_COOKIE,
  COOKIE_MAX_AGE,
  DEVICE_COOKIE,
  agentSlugFromPath,
  encodeAttribution,
  parseCookies,
} from "./lib/request-context.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
 * קוקיז של זהות וייחוס — מונפקים פעם אחת בדפדפן, HttpOnly:
 *   sc_did   מזהה מכשיר אקראי (למכסות ולמגבלות קצב של גולש אנונימי)
 *   sc_agent הסוכן של המגע הראשון (דף אישי שדרכו הגיע הגולש) — שנה
 *   sc_utm   utm/referrer/דף נחיתה של המגע הראשון — שנה
 * רק על בקשות HTML (לא API, לא server functions, לא קבצים סטטיים).
 * ------------------------------------------------------------------ */

const isHtmlNavigation = (request: Request, url: URL) => {
  if (request.method !== "GET") return false;
  const p = url.pathname;
  if (p.startsWith("/api/") || p.startsWith("/_serverFn") || p.startsWith("/_build")) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return false;
  return (request.headers.get("accept") ?? "").includes("text/html");
};

const randomId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
};

function identityCookies(request: Request, url: URL): string[] {
  const cookies = parseCookies(request.headers.get("cookie"));
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const base = `; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
  const out: string[] = [];

  if (!cookies[DEVICE_COOKIE]) out.push(`${DEVICE_COOKIE}=${randomId()}${base}`);

  const slug = agentSlugFromPath(url.pathname);
  if (slug && !cookies[AGENT_COOKIE]) out.push(`${AGENT_COOKIE}=${slug}${base}`);

  if (!cookies[ATTRIBUTION_COOKIE]) {
    const referrer = request.headers.get("referer") ?? "";
    let externalReferrer: string | null = null;
    try {
      if (referrer && new URL(referrer).host !== url.host)
        externalReferrer = referrer.slice(0, 300);
    } catch {
      externalReferrer = null;
    }
    const value = encodeAttribution({
      utmSource: url.searchParams.get("utm_source")?.slice(0, 80) ?? null,
      utmCampaign: url.searchParams.get("utm_campaign")?.slice(0, 120) ?? null,
      utmContent:
        (url.searchParams.get("utm_content") ?? url.searchParams.get("utm_medium"))?.slice(
          0,
          120,
        ) ?? null,
      referrer: externalReferrer,
      landingPath: url.pathname.slice(0, 300),
    });
    out.push(`${ATTRIBUTION_COOKIE}=${value}${base}`);
  }
  return out;
}

function withCookies(response: Response, cookies: string[]): Response {
  if (!cookies.length) return response;
  const headers = new Headers(response.headers);
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await normalizeCatastrophicSsrResponse(
        await handler.fetch(request, env, ctx),
      );
      try {
        const url = new URL(request.url);
        if (isHtmlNavigation(request, url))
          return withCookies(response, identityCookies(request, url));
      } catch {
        // קוקיז הם תוספת — כשל בהם לא מפיל את הדף
      }
      return response;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
