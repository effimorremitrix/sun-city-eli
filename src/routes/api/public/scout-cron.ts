import { createFileRoute } from "@tanstack/react-router";

/**
 * תאימות לאחור: הנתיב הישן של סריקת סוכן הנכסים. הסוד מאומת גם מול
 * app_settings וגם מול SCOUT_CRON_SECRET. הריצה עצמה עוברת דרך runJob
 * (נרשמת ב-job_runs).
 */
export const Route = createFileRoute("/api/public/scout-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyCronSecret, runJob } = await import("@/lib/jobs.server");
        if (!(await verifyCronSecret(request.headers.get("x-cron-secret")))) {
          return new Response("unauthorized", { status: 401 });
        }
        const result = await runJob("scout", "cron");
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
