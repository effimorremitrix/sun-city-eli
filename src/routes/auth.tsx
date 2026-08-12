import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const title = 'כניסה לאזור הניהול | סאן סיטי נדל"ן';
const description = 'כניסה מאובטחת לאזור הניהול של אתר סאן סיטי נדל"ן בנתניה — עריכת תוכן, פרטי קשר ופריטים.';

export const Route = createFileRoute("/auth")({
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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setMsg("נשלח אימות למייל. לאחר האישור אפשר להתחבר.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "שגיאה בהתחברות");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="soft-card w-full max-w-sm p-6">
        <h1 className="text-2xl font-extrabold text-primary">אזור ניהול</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "התחברות עם המייל והסיסמה שקיבלת" : "פתיחת חשבון חדש"}
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">אימייל</span>
            <input
              className="field"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סיסמה</span>
            <input
              className="field"
              type="password"
              dir="ltr"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {busy ? "רגע…" : mode === "signin" ? "התחברות" : "הרשמה"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErr(null);
            setMsg(null);
          }}
          className="mt-4 w-full text-sm font-semibold text-primary underline"
        >
          {mode === "signin" ? "אין לי חשבון עדיין" : "יש לי חשבון, להתחברות"}
        </button>

        <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground underline">
          חזרה לאתר
        </Link>
      </div>
    </main>
  );
}
