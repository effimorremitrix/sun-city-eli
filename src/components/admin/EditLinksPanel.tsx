import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createEditLink, listEditLinks, revokeEditLink } from "@/lib/edit-link.functions";
import { openWa } from "@/lib/site-data";

/** קישורי עריכה קבועים ללקוח — בלי חשבון ובלי סיסמה */
export function EditLinksPanel({ siteId, siteName }: { siteId: string; siteName: string }) {
  const fetchLinks = useServerFn(listEditLinks);
  const create = useServerFn(createEditLink);
  const revoke = useServerFn(revokeEditLink);

  const links = useQuery({
    queryKey: ["edit-links", siteId],
    queryFn: () => fetchLinks({ data: { siteId } }),
  });

  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const freshUrl = fresh ? `${origin}/edit?k=${fresh}` : null;

  const generate = async () => {
    setBusy(true);
    setErr(null);
    setCopied(false);
    try {
      const res = await create({ data: { siteId, label } });
      setFresh(res.token);
      setLabel("");
      await links.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "יצירת הקישור נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!freshUrl) return;
    try {
      await navigator.clipboard.writeText(freshUrl);
      setCopied(true);
    } catch {
      setErr("ההעתקה נכשלה — סמנו את הקישור והעתיקו ידנית");
    }
  };

  const share = () => {
    if (!freshUrl) return;
    openWa(
      `שלום, זה קישור העריכה האישי שלך לאתר ${siteName}.\nלחיצה על הקישור פותחת את אזור העריכה — בלי הרשמה ובלי סיסמה.\nשמור את ההודעה הזאת, הקישור עובד תמיד.\n${freshUrl}`,
    );
  };

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="text-lg font-extrabold text-primary">קישורי עריכה ללקוח</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        קישור אישי שמאפשר ללקוח לערוך את האתר בלי חשבון ובלי סיסמה. הקוד מוצג פעם אחת בלבד — שמרו או שלחו אותו מיד.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="field flex-1"
          placeholder="שם לזיהוי (למשל: אלי כליף — טלפון)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="rounded-xl bg-sun px-5 py-3 text-sm font-bold text-sun-foreground disabled:opacity-60"
        >
          צור קישור עריכה
        </button>
      </div>

      {err && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {err}
        </p>
      )}

      {freshUrl && (
        <div className="mt-4 rounded-xl border border-sun/40 bg-sun/10 p-4">
          <p className="text-xs font-bold text-primary">הקישור נוצר. זו ההצגה היחידה שלו:</p>
          <p dir="ltr" className="mt-2 break-all rounded-lg bg-background p-2 text-xs">
            {freshUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-primary"
            >
              {copied ? "הועתק" : "העתקת הקישור"}
            </button>
            <button
              type="button"
              onClick={share}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              שליחה בוואטסאפ
            </button>
          </div>
        </div>
      )}

      <ul className="mt-5 divide-y divide-border">
        {(links.data ?? []).map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-bold text-primary">{l.label || "קישור עריכה"}</p>
              <p className="text-xs text-muted-foreground">
                נוצר: {new Date(l.created_at).toLocaleDateString("he-IL")} ·{" "}
                {l.revoked_at
                  ? "מבוטל"
                  : l.last_used_at
                    ? `שימוש אחרון: ${new Date(l.last_used_at).toLocaleDateString("he-IL")}`
                    : "טרם היה בשימוש"}
              </p>
            </div>
            {!l.revoked_at && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await revoke({ data: { id: l.id } });
                    await links.refetch();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive"
              >
                ביטול קישור
              </button>
            )}
          </li>
        ))}
        {(links.data ?? []).length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">אין קישורי עריכה עדיין.</li>
        )}
      </ul>
    </section>
  );
}
