import { createFileRoute } from "@tanstack/react-router";

/**
 * נקודת הקצה של המתזמן: POST /api/public/jobs/<name> עם הכותרת x-cron-secret
 * (הסוד מ-app_settings, או SCOUT_CRON_SECRET הישן). נקראת מ-pg_cron דרך
 * pg_net, ממתזמן חיצוני, או ידנית מטאב "מערכת" (דרך server fn נפרד).
 */
export const Route = createFileRoute("/api/public/jobs/$name")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { isJobName, verifyCronSecret, runJob } = await import("@/lib/jobs.server");
        const name = params.name;
        if (!isJobName(name)) return new Response("unknown job", { status: 404 });
        const provided = request.headers.get("x-cron-secret");
        if (!(await verifyCronSecret(provided))) {
          return new Response("unauthorized", { status: 401 });
        }
        const result = await runJob(name, "cron");
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
