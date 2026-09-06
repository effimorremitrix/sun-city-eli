import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBackToSiteHref } from "@/lib/back-to-site";
import { LangProvider, useLang, useStoredLocale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { useServerFn } from "@tanstack/react-start";
import { registerClient } from "@/lib/auth.functions";

const title = 'כניסה לאזור האישי | סאן סיטי נדל"ן';
const description =
  'הרשמה וכניסה לאזור האישי באתר סאן סיטי נדל"ן — הגדרת סוכן אישי והתראות על דירות חדשות בנתניה.';

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

/** לדף אין סגמנט שפה בכתובת — השפה נלקחת מהבחירה האחרונה באתר הציבורי */
function AuthPage() {
  const lang = useStoredLocale();
  return (
    <LangProvider lang={lang}>
      <AuthContent />
    </LangProvider>
  );
}

/**
 * כניסה בטלפון (SMS OTP) — מאחורי דגל תצורה: דורשת חיבור ספק SMS (למשל
 * Twilio Verify) בלוח הבקרה של Supabase דרך Lovable Cloud. עד שהספק מחובר
 * הדגל כבוי והטאב מוסתר, בלי לגעת בכניסת המייל.
 */
const PHONE_AUTH_ENABLED = import.meta.env["VITE_PHONE_AUTH_ENABLED"] === "true";

/** נרמול מספר ישראלי ל-E.164 (‎+9725xxxxxxxx) — הפורמט ש-Supabase דורש */
const toE164 = (phone: string): string | null => {
  const digits = phone.replace(/[^\d+]/g, "");
  if (/^\+9725\d{8}$/.test(digits)) return digits;
  if (/^05\d{8}$/.test(digits)) return `+972${digits.slice(1)}`;
  return null;
};

function AuthContent() {
  const { t, dir } = useLang();
  const navigate = useNavigate();
  const backHref = useBackToSiteHref();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const register = useServerFn(registerClient);

  const sendOtp = async () => {
    setErr(null);
    setMsg(null);
    const e164 = toE164(phone);
    if (!e164) return setErr(t.auth.phoneInvalid);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setOtpSent(true);
      setMsg(t.auth.codeSent);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.auth.otpFailed);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setErr(null);
    setMsg(null);
    const e164 = toE164(phone);
    if (!e164 || otpCode.trim().length < 4) return setErr(t.auth.otpFailed);
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: otpCode.trim(),
        type: "sms",
      });
      if (error) throw error;
      trackEvent("login", null);
      navigate({ to: "/account", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.auth.otpFailed);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        trackEvent("login", null);
        navigate({ to: "/account", replace: true });
      } else {
        const result = await register({
          data: {
            email,
            password,
            fullName: fullName.trim(),
            redirectTo: `${window.location.origin}/account`,
            website: honeypot,
          },
        });
        if (!result.ok) {
          throw new Error(
            result.error === "rate_limited"
              ? t.limits.signupLimit
              : result.error === "invalid"
                ? t.auth.signinFailed
                : (result.error ?? t.auth.signinFailed),
          );
        }
        trackEvent("signup", null);
        setMsg(t.auth.signupSuccess);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.auth.signinFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      dir={dir}
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
    >
      <div className="soft-card w-full max-w-sm p-6">
        <h1 className="text-2xl font-extrabold text-primary">{t.auth.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? t.auth.signinSubtitle : t.auth.signupSubtitle}
        </p>

        {PHONE_AUTH_ENABLED && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border p-1 text-sm font-bold">
            <button
              type="button"
              aria-pressed={method === "email"}
              onClick={() => setMethod("email")}
              className={`rounded-lg py-2 ${method === "email" ? "bg-sun text-sun-foreground" : "text-muted-foreground"}`}
            >
              {t.auth.emailTab}
            </button>
            <button
              type="button"
              aria-pressed={method === "phone"}
              onClick={() => setMethod("phone")}
              className={`rounded-lg py-2 ${method === "phone" ? "bg-sun text-sun-foreground" : "text-muted-foreground"}`}
            >
              {t.auth.phoneTab}
            </button>
          </div>
        )}

        {PHONE_AUTH_ENABLED && method === "phone" && (
          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.auth.phoneLabel}
              </span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder={t.auth.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {otpSent && (
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.auth.codeLabel}
                </span>
                <input
                  className="field"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </label>
            )}
            {err && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {err}
              </p>
            )}
            {msg && <p className="text-sm font-semibold text-primary">{msg}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void (otpSent ? verifyOtp() : sendOtp())}
              className="mt-1 rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
            >
              {busy ? t.auth.working : otpSent ? t.auth.verifyCode : t.auth.sendCode}
            </button>
          </div>
        )}

        {(!PHONE_AUTH_ENABLED || method === "email") && (
          <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
            {mode === "signup" && (
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            )}
            {mode === "signup" && (
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.auth.fullName}
                </span>
                <input
                  className="field"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === "signup"}
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.auth.email}
              </span>
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
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.auth.password}
              </span>
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
              {busy ? t.auth.working : mode === "signin" ? t.auth.signin : t.auth.signup}
            </button>
          </form>
        )}

        {(!PHONE_AUTH_ENABLED || method === "email") && (
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null);
              setMsg(null);
            }}
            className="mt-4 w-full text-sm font-semibold text-primary underline"
          >
            {mode === "signin" ? t.auth.toggleToSignup : t.auth.toggleToSignin}
          </button>
        )}

        {(!PHONE_AUTH_ENABLED || method === "email") && mode === "signin" && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setErr(null);
              setMsg(null);
              if (!email.trim() || !email.includes("@")) {
                setErr(t.auth.forgotNeedEmail);
                return;
              }
              setBusy(true);
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setMsg(t.auth.resetSent);
              } catch (e) {
                setErr(e instanceof Error ? e.message : t.auth.resetFailed);
              } finally {
                setBusy(false);
              }
            }}
            className="mt-2 w-full text-xs text-muted-foreground underline"
          >
            {t.auth.forgot}
          </button>
        )}

        <a
          href={backHref}
          className="mt-4 block text-center text-xs text-muted-foreground underline"
        >
          {t.auth.backToSite}
        </a>
      </div>
    </main>
  );
}
