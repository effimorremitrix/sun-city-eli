import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AccountSettings() {
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
      setErr("נא להזין כתובת מייל תקינה");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setNewEmail("");
      setMsg("נשלח מייל אישור לכתובת החדשה. המייל בחשבון יתחלף רק לאחר הלחיצה על הקישור שבמייל.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "עדכון המייל נכשל");
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async () => {
    setErr(null);
    setMsg(null);
    if (pw1.length < 8) {
      setErr("הסיסמה החדשה צריכה להכיל לפחות 8 תווים");
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
      setPw1("");
      setPw2("");
      setMsg("הסיסמה עודכנה בהצלחה.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "עדכון הסיסמה נכשל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <KeyRound className="size-5 text-sun" aria-hidden="true" />
        הגדרות חשבון
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        המייל הנוכחי בחשבון: <span dir="ltr" className="font-bold text-primary">{currentEmail ?? "…"}</span>
      </p>

      {msg && <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>}
      {err && (
        <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {err}
        </p>
      )}

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <h3 className="text-sm font-extrabold text-primary">שינוי כתובת מייל</h3>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">מייל חדש</span>
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
            עדכון מייל
          </button>
          <p className="text-xs text-muted-foreground">
            לאחר השליחה יגיע מייל אישור לכתובת החדשה — רק לחיצה עליו משנה את המייל בחשבון.
          </p>
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-extrabold text-primary">שינוי סיסמה</h3>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">סיסמה חדשה</span>
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
            <span className="mb-1 block text-xs font-bold text-muted-foreground">אימות סיסמה חדשה</span>
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
            עדכון סיסמה
          </button>
          <p className="text-xs text-muted-foreground">לפחות 8 תווים.</p>
        </div>
      </div>
    </section>
  );
}
