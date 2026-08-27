import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export default function AccountSettings() {
  const { t } = useLang();
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? null));
  }, []);

  const updateEmail = async () => {
    setErr(null);
    setMsg(null);
    const email = newEmail.trim();
    if (!email || !email.includes("@")) {
      setErr(t.accountSettings.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setNewEmail("");
      setMsg(t.accountSettings.emailSent);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.accountSettings.emailFailed);
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async () => {
    setErr(null);
    setMsg(null);
    if (pw1.length < 8) {
      setErr(t.accountSettings.tooShort);
      return;
    }
    if (pw1 !== pw2) {
      setErr(t.accountSettings.mismatch);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      setMsg(t.accountSettings.passwordUpdated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.accountSettings.passwordFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <KeyRound className="size-5 text-sun" aria-hidden="true" />
        {t.accountSettings.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.accountSettings.currentEmail}{" "}
        <span dir="ltr" className="font-bold text-primary">
          {currentEmail ?? "…"}
        </span>
      </p>

      {msg && (
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>
      )}
      {err && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <h3 className="text-sm font-extrabold text-primary">{t.accountSettings.changeEmail}</h3>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.accountSettings.newEmail}
            </span>
            <input
              className="field"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={updateEmail}
            className="rounded-xl bg-sun py-3 text-sm font-bold text-sun-foreground disabled:opacity-60"
          >
            {t.accountSettings.updateEmail}
          </button>
          <p className="text-xs text-muted-foreground">{t.accountSettings.emailNote}</p>
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-extrabold text-primary">
            {t.accountSettings.changePassword}
          </h3>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.accountSettings.newPassword}
            </span>
            <input
              className="field"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.accountSettings.confirmPassword}
            </span>
            <input
              className="field"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={updatePassword}
            className="rounded-xl bg-sun py-3 text-sm font-bold text-sun-foreground disabled:opacity-60"
          >
            {t.accountSettings.updatePassword}
          </button>
          <p className="text-xs text-muted-foreground">{t.accountSettings.minChars}</p>
        </div>
      </div>
    </section>
  );
}
