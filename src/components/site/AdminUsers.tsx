import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListUsers,
  adminGetUserDetail,
  adminSetUserRole,
  adminDeleteUser,
  type AdminUserRow,
} from "@/lib/users.functions";

const NONE = "אין מידע";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

const money = (v: number | null) => (v == null ? NONE : `${v.toLocaleString("he-IL")} ₪`);
const val = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? NONE : String(v);

export function AdminUsers() {
  const listUsers = useServerFn(adminListUsers);
  const getDetail = useServerFn(adminGetUserDetail);
  const setRole = useServerFn(adminSetUserRole);
  const deleteUser = useServerFn(adminDeleteUser);

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => listUsers() });

  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [roleTarget, setRoleTarget] = useState<{ user: AdminUserRow; makeAdmin: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const detail = useQuery({
    queryKey: ["admin-user-detail", openId],
    queryFn: () => getDetail({ data: { userId: openId as string } }),
    enabled: Boolean(openId),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = users.data?.users ?? [];
    if (!term) return rows;
    return rows.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(term) || (u.email ?? "").toLowerCase().includes(term),
    );
  }, [q, users.data]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await users.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const currentUserId = users.data?.currentUserId ?? null;

  return (
    <section className="soft-card mt-6 p-5">
      <h2 className="text-lg font-extrabold text-primary">משתמשים רשומים</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        מקור המידע: מסד הנתונים של האתר. שדה ללא נתון מוצג כ״{NONE}״.
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold text-muted-foreground">חיפוש לפי שם או מייל</span>
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="הקלידו שם או מייל" />
      </label>

      {msg && <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>}
      {err && (
        <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {err}
        </p>
      )}

      {users.isLoading && <p className="mt-3 text-sm text-muted-foreground">טוען משתמשים…</p>}
      {!users.isLoading && filtered.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">לא נמצאו משתמשים.</p>
      )}

      <ul className="mt-4 grid gap-3">
        {filtered.map((u) => {
          const isSelf = u.id === currentUserId;
          const isOpen = openId === u.id;
          return (
            <li key={u.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-primary">
                    {val(u.full_name)}
                    {u.is_admin && (
                      <span className="rounded-full bg-sun/20 px-2 py-0.5 text-xs font-bold text-primary">מנהל</span>
                    )}
                    {isSelf && <span className="text-xs font-normal text-muted-foreground">(אני)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {val(u.email)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    נרשם ב־{fmtDate(u.created_at)} · {u.profiles_count} פרופילי חיפוש · {u.notifications_count} התראות
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" className="underline" onClick={() => setOpenId(isOpen ? null : u.id)}>
                    {isOpen ? "סגירה" : "פירוט"}
                  </button>
                  {!isSelf && (
                    <>
                      <button
                        type="button"
                        className="underline"
                        disabled={busy}
                        onClick={() => setRoleTarget({ user: u, makeAdmin: !u.is_admin })}
                      >
                        {u.is_admin ? "הסרת הרשאת מנהל" : "הפיכה למנהל"}
                      </button>
                      <button
                        type="button"
                        className="text-destructive underline"
                        disabled={busy}
                        onClick={() => {
                          setDeleteTarget(u);
                          setConfirmEmail("");
                        }}
                      >
                        מחיקה
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 border-t border-border pt-3">
                  {detail.isLoading && <p className="text-sm text-muted-foreground">טוען פרופילי חיפוש…</p>}
                  {!detail.isLoading && (detail.data?.profiles ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">למשתמש אין פרופילי חיפוש.</p>
                  )}
                  <ul className="grid gap-3">
                    {(detail.data?.profiles ?? []).map((p) => (
                      <li key={p.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
                        <p className="font-bold text-primary">
                          {val(p.label)}{" "}
                          {!p.is_active && <span className="text-xs text-muted-foreground">(לא פעיל)</span>}
                        </p>
                        <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <div>סוג עסקה: {val(p.deal_type)}</div>
                          <div>עיר: {val(p.city)}</div>
                          <div>שכונות: {p.neighborhoods.length ? p.neighborhoods.join(", ") : NONE}</div>
                          <div>
                            טווח מחיר: {money(p.min_price)} – {money(p.max_price)}
                          </div>
                          <div>מינימום חדרים: {val(p.min_rooms)}</div>
                          <div>מינימום מ״ר: {val(p.min_size)}</div>
                          <div>
                            דרישות:{" "}
                            {[
                              p.needs_mamad && "ממ״ד",
                              p.needs_elevator && "מעלית",
                              p.needs_parking && "חניה",
                              p.needs_balcony && "מרפסת",
                            ]
                              .filter(Boolean)
                              .join(", ") || NONE}
                          </div>
                          <div>התראות במייל: {p.notify_email ? "כן" : "לא"}</div>
                          <div className="sm:col-span-2">הערות: {val(p.notes)}</div>
                          <div className="sm:col-span-2">נוצר ב־{fmtDate(p.created_at)}</div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* אישור שינוי הרשאה */}
      {roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4">
          <div className="soft-card w-full max-w-sm bg-background p-5">
            <h3 className="text-base font-extrabold text-primary">
              {roleTarget.makeAdmin ? "הפיכה למנהל" : "הסרת הרשאת מנהל"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {roleTarget.makeAdmin
                ? `למשתמש ${val(roleTarget.user.full_name)} תינתן הרשאת ניהול מלאה לאתר.`
                : `הרשאת הניהול של ${val(roleTarget.user.full_name)} תוסר.`}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={busy}
                className="flex-1 rounded-xl bg-sun py-3 text-sm font-bold text-sun-foreground disabled:opacity-60"
                onClick={async () => {
                  const t = roleTarget;
                  setRoleTarget(null);
                  await run(
                    () => setRole({ data: { userId: t.user.id, makeAdmin: t.makeAdmin } }),
                    t.makeAdmin ? "ההרשאה נוספה" : "ההרשאה הוסרה",
                  );
                }}
              >
                אישור
              </button>
              <button
                type="button"
                className="rounded-xl border border-primary/30 px-5 py-3 text-sm font-bold text-primary"
                onClick={() => setRoleTarget(null)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* אישור מחיקה */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4">
          <div className="soft-card w-full max-w-sm bg-background p-5">
            <h3 className="text-base font-extrabold text-destructive">מחיקת משתמש</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              החשבון וכל הנתונים שלו (פרופילי חיפוש והתראות) יימחקו לצמיתות. להמשך, הקלידו את המייל של המשתמש:
            </p>
            <p className="mt-1 text-xs font-bold text-primary" dir="ltr">
              {val(deleteTarget.email)}
            </p>
            <input
              className="field mt-3"
              dir="ltr"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={busy || confirmEmail.trim().toLowerCase() !== (deleteTarget.email ?? "").toLowerCase()}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-60"
                onClick={async () => {
                  const t = deleteTarget;
                  const email = confirmEmail;
                  setDeleteTarget(null);
                  setConfirmEmail("");
                  if (openId === t.id) setOpenId(null);
                  await run(() => deleteUser({ data: { userId: t.id, confirmEmail: email } }), "המשתמש נמחק");
                }}
              >
                מחיקה סופית
              </button>
              <button
                type="button"
                className="rounded-xl border border-primary/30 px-5 py-3 text-sm font-bold text-primary"
                onClick={() => {
                  setDeleteTarget(null);
                  setConfirmEmail("");
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
