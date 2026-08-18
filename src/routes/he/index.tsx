import { createFileRoute, redirect } from "@tanstack/react-router";

/** עברית מוגשת רק מהנתיב הקנוני "/" */
export const Route = createFileRoute("/he/")({
  beforeLoad: () => {
    throw redirect({ to: "/{-$lang}", params: { lang: undefined } });
  },
});
