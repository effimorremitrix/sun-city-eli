import { createFileRoute } from "@tanstack/react-router";

/** סריקה יומית אוטומטית של סוכן הנכסים. מוגן בסוד x-cron-secret */
export const Route = createFileRoute("/api/public/scout-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SCOUT_CRON_SECRET"];
        if (!secret) return new Response("not configured", { status: 503 });
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (provided.length !== secret.length || provided !== secret) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profiles, error } = await supabaseAdmin
          .from("scout_profiles")
          .select("*")
          .eq("is_active", true);
        if (error) return new Response("db error", { status: 500 });
        if (!profiles || profiles.length === 0) return Response.json({ scanned: 0, inserted: 0 });

        const { runScoutForProfiles } = await import("@/lib/scout-run.server");
        const result = await runScoutForProfiles(supabaseAdmin as never, profiles as never, null);
        return Response.json(result);
      },
    },
  },
});
