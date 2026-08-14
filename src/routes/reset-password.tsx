import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const title = 'איפוס סיסמה | סאן סיטי נדל"ן';
const description = 'הגדרת סיסמה חדשה לחשבון באתר סאן סיטי נדל"ן.';

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(Boolean(session));
      setReady(true);
    });
    void check();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (pw1.length < 8) {
      setErr("הסיסמה צריכה להכיל לפחות 8 תווים");
      return;
    }
    if (pw1 !== pw2) {
      setErr("הסיסמאות אינן תואמות");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setMsg("הסיסמה עודכנה. מעבירים אותך לאזור האישי…");
      setTimeout(() => navigate({ to: "/account", replace: true }), 1200);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "עדכון הסיסמה נכשל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="soft-card w-full max-w-sm p-6">
        <h1 className="text-2xl font-extrabold text-primary">הגדרת סיסמה חדשה</h1>

        {!ready && <p className="mt-2 text-sm text-muted-foreground">טוען…</p>}

        {ready && !hasSession && (
          <p className="mt-2 text-sm text-muted-foreground">
            הקישור לאיפוס סיסמה אינו בתוקף. אפשר לבקש קישור חדש מעמוד הכניסה.
          </p>
        )}

        {ready && hasSession && (
          <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">סיסמה חדשה</span>
              <input
                className="field"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">אימות סיסמה</span>
              <input
                className="field"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
            </label>

            {err && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {err}
              </p>
            )}
            {msg && <p className="text-sm font-semibold text-primary">{msg}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
            >
              {busy ? "רגע…" : "שמירת הסיסמה"}
            </button>
          </form>
        )}

        <Link to="/auth" className="mt-4 block text-center text-xs text-muted-foreground underline">
          חזרה לעמוד הכניסה
        </Link>
      </div>
    </main>
  );
}
