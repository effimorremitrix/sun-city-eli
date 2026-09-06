import { createFileRoute } from "@tanstack/react-router";

/** בדיקת בריאות ציבורית (למוניטור חיצוני): רק ok/degraded ושמות הרכיבים */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { healthReport } = await import("@/lib/jobs.server");
          const report = await healthReport();
          return Response.json(
            {
              status: report.ok ? "ok" : "degraded",
              checkedAt: report.checkedAt,
              components: Object.fromEntries(report.components.map((c) => [c.name, c.ok])),
            },
            { status: report.ok ? 200 : 503, headers: { "cache-control": "no-store" } },
          );
        } catch (e) {
          return Response.json(
            { status: "error", error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
