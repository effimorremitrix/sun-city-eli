import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * אזור הניהול אוחד לתוך האזור האישי (/account) — טאבי הניהול מוצגים שם.
 * הנתיב הישן נשאר כהפניה כדי שסימניות וקישורים קיימים ימשיכו לעבוד.
 */
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/account", search: { tab: "listings" } });
  },
});
