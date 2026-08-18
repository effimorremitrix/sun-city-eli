import { createFileRoute } from "@tanstack/react-router";

/**
 * OAuth callback של פייסבוק: מחליף את ה-code בטוקן עמוד ארוך-טווח ושומר
 * את החיבור ל-site (ה-state חתום ומכיל את מזהה ה-site). בסיום — חזרה
 * לאזור הניהול עם סטטוס.
 */
export const Route = createFileRoute("/api/facebook/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const fbError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

        const redirect = (query: string) =>
          new Response(null, {
            status: 302,
            headers: { location: `/admin?fb=${query}` },
          });

        if (fbError) return redirect(`error&reason=${encodeURIComponent(fbError.slice(0, 200))}`);
        if (!code || !state) return redirect("error&reason=missing_params");

        try {
          const { handleFacebookCallback } = await import("@/lib/facebook.server");
          const result = await handleFacebookCallback(code, state);
          return redirect(`connected&page=${encodeURIComponent(result.pageName)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "connection failed";
          console.error("facebook callback failed", err);
          return redirect(`error&reason=${encodeURIComponent(msg.slice(0, 200))}`);
        }
      },
    },
  },
});
