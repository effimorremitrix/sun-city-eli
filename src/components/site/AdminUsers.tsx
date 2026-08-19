import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListUsers,
  adminGetUserDetail,
  adminSetUserRole,
  adminDeleteUser,
  adminCreateAgentSite,
  adminInviteAgent,
  type AdminUserRow,
} from "@/lib/users.functions";
import AdminImageField from "@/components/site/AdminImageField";

const NONE = "אין מידע";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

const money = (v: number | null) => (v == null ? NONE : `${v.toLocaleString("he-IL")} ₪`);
const val = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? NONE : String(v);

/**
 * רשימת המשתמשים, מופרדת לשני טאבים: הצוות (סוכנים ומנהלים) והלקוחות הרשומים.
 * שני הטאבים מציגים את אותו כרטיס משתמש — רק קהל היעד והכותרות משתנים.
 */
export type UsersAudience = "agents" | "clients";

/** משתמש נחשב לצוות אם יש לו דף סוכן או הרשאת ניהול; כל השאר הם לקוחות */
const isStaff = (u: AdminUserRow) => u.is_agent || u.is_admin || u.is_super_admin;

const COPY: Record<UsersAudience, { title: string; hint: string; empty: string; search: string }> =
  {
    agents: {
      title: "סוכנים וצוות",
      hint: "הסוכנים ובעלי הרשאות הניהול. לכל סוכן דף אישי בכתובת /slug.",
      empty: "לא נמצאו סוכנים.",
      search: "חיפוש סוכן לפי שם או מייל",
    },
    clients: {
      title: "לקוחות רשומים",
      hint: "הגולשים שנרשמו לאתר: פרופילי החיפוש וההתראות שלהם. אינם סוכנים ואין להם דף אישי.",
      empty: "לא נמצאו לקוחות.",
      search: "חיפוש לקוח לפי שם או מייל",
    },
  };

export function AdminUsers({ audience }: { audience: UsersAudience }) {
  const copy = COPY[audience];
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

  const [roleTarget, setRoleTarget] = useState<{ user: AdminUserRow; makeAdmin: boolean } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const createAgent = useServerFn(adminCreateAgentSite);
  const inviteAgent = useServerFn(adminInviteAgent);
  // מצב המודל: קידום משתמש קיים לסוכן, או הזמנת סוכן חדש מאפס (במייל)
  const [agentModal, setAgentModal] = useState<
    { mode: "promote"; user: AdminUserRow } | { mode: "invite" } | null
  >(null);
  const emptyAgentForm = {
    slug: "",
    agentName: "",
    roleTitle: "",
    phone: "",
    email: "",
    photoUrl: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    whatsappGroup: "",
  };
  const [agentForm, setAgentForm] = useState(emptyAgentForm);

  const detail = useQuery({
    queryKey: ["admin-user-detail", openId],
    queryFn: () => getDetail({ data: { userId: openId as string } }),
    enabled: Boolean(openId),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = (users.data?.users ?? []).filter((u) =>
      audience === "agents" ? isStaff(u) : !isStaff(u),
    );
    if (!term) return rows;
    return rows.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(term) ||
        (u.email ?? "").toLowerCase().includes(term),
    );
  }, [q, users.data, audience]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-primary">{copy.title}</h2>
        {audience === "agents" && (
          <button
            type="button"
            className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
            onClick={() => {
              setAgentModal({ mode: "invite" });
              setAgentForm(emptyAgentForm);
            }}
          >
            + הוספת סוכן חדש
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {copy.hint} שדה ללא נתון מוצג כ״{NONE}״.
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold text-muted-foreground">{copy.search}</span>
        <input
          className="field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="הקלידו שם או מייל"
        />
      </label>

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

      {users.isLoading && <p className="mt-3 text-sm text-muted-foreground">טוען משתמשים…</p>}
      {!users.isLoading && filtered.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{copy.empty}</p>
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
                    {u.is_super_admin ? (
                      <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-sun-foreground">
                        מנהל ראשי
                      </span>
                    ) : (
                      u.is_admin && (
                        <span className="rounded-full bg-sun/20 px-2 py-0.5 text-xs font-bold text-primary">
                          מנהל
                        </span>
                      )
                    )}
                    {u.is_agent && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                        סוכן{u.agent_slug ? ` · /${u.agent_slug}` : ""}
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-xs font-normal text-muted-foreground">(אני)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {val(u.email)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    נרשם ב־{fmtDate(u.created_at)} · {u.profiles_count} פרופילי חיפוש ·{" "}
                    {u.notifications_count} התראות
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setOpenId(isOpen ? null : u.id)}
                  >
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
                      {!u.is_agent && (
                        <button
                          type="button"
                          className="underline"
                          disabled={busy}
                          onClick={() => {
                            setAgentModal({ mode: "promote", user: u });
                            setAgentForm({
                              ...emptyAgentForm,
                              agentName: u.full_name ?? "",
                              email: u.email ?? "",
                            });
                          }}
                        >
                          הפיכה לסוכן עם דף אישי
                        </button>
                      )}
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
                  {detail.isLoading && (
                    <p className="text-sm text-muted-foreground">טוען פרופילי חיפוש…</p>
                  )}
                  {!detail.isLoading && (detail.data?.profiles ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">למשתמש אין פרופילי חיפוש.</p>
                  )}
                  <ul className="grid gap-3">
                    {(detail.data?.profiles ?? []).map((p) => (
                      <li key={p.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
                        <p className="font-bold text-primary">
                          {val(p.label)}{" "}
                          {!p.is_active && (
                            <span className="text-xs text-muted-foreground">(לא פעיל)</span>
                          )}
                        </p>
                        <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <div>סוג עסקה: {val(p.deal_type)}</div>
                          <div>עיר: {val(p.city)}</div>
                          <div>
                            שכונות: {p.neighborhoods.length ? p.neighborhoods.join(", ") : NONE}
                          </div>
                          <div>
                            טווח מחיר: {money(p.min_price)} – {money(p.max_price)}
                          </div>
                          <div>מינימום חדרים: {val(p.min_rooms)}</div>
                          <div>חדרים (מדויק): {val(p.rooms)}</div>
                          <div>מקסימום חדרים: {val(p.max_rooms)}</div>
                          <div>רחוב: {val(p.street)}</div>
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
                          <div>
                            התראות בוואטסאפ:{" "}
                            {p.notify_whatsapp ? `כן (${val(p.whatsapp_phone)})` : "לא"}
                          </div>
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

      {/* הקמת סוכן עם דף אישי (קידום משתמש קיים או הזמנה של סוכן חדש במייל) */}
      {agentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4">
          <div className="soft-card max-h-[90vh] w-full max-w-md overflow-y-auto bg-background p-5">
            <h3 className="text-base font-extrabold text-primary">
              {agentModal.mode === "invite" ? "הוספת סוכן חדש" : "הקמת דף אישי לסוכן"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {agentModal.mode === "invite"
                ? "אם המייל לא רשום עדיין — ייווצר חשבון והסוכן יקבל מייל הזמנה להגדרת סיסמה. בכל מקרה יוקם לו דף אישי בכתובת /‏slug באותו עיצוב של האתר."
                : `${val(agentModal.user.full_name)} יקבל תפקיד סוכן ודף אישי בכתובת /‏slug באותו עיצוב של האתר. בדף יוצג מלאי הנכסים של כל המשרד, וכל הפניות ממנו ינותבו אליו.`}
            </p>
            <div className="mt-3 grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  כתובת הדף (אותיות לטיניות, למשל: yelena)
                </span>
                <input
                  className="field"
                  dir="ltr"
                  value={agentForm.slug}
                  onChange={(e) => setAgentForm({ ...agentForm, slug: e.target.value })}
                  placeholder="yelena"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  שם הסוכן להצגה
                </span>
                <input
                  className="field"
                  value={agentForm.agentName}
                  onChange={(e) => setAgentForm({ ...agentForm, agentName: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  תפקיד (למשל: מומחית נדל"ן, דוברת רוסית)
                </span>
                <input
                  className="field"
                  value={agentForm.roleTitle}
                  onChange={(e) => setAgentForm({ ...agentForm, roleTitle: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  טלפון (הפניות מהדף ינותבו אליו)
                </span>
                <input
                  className="field"
                  dir="ltr"
                  value={agentForm.phone}
                  onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                  placeholder="050-1234567"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {agentModal.mode === "invite"
                    ? "מייל הסוכן (אליו תישלח ההזמנה)"
                    : "מייל להצגה בדף"}
                </span>
                <input
                  className="field"
                  dir="ltr"
                  value={agentForm.email}
                  onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                  placeholder="agent@example.com"
                />
              </label>
              <AdminImageField
                label="תמונת הסוכן"
                folder="agents"
                hint="מוצגת בדף האישי של הסוכן, בקרוסלת הצוות ובכרטיסי הנכסים."
                value={agentForm.photoUrl}
                onChange={(url) => setAgentForm({ ...agentForm, photoUrl: url })}
              />
              <fieldset className="rounded-xl border border-border p-3">
                <legend className="px-1 text-xs font-bold text-muted-foreground">
                  רשתות חברתיות של הסוכן (יוצגו בראש הדף האישי שלו)
                </legend>
                <div className="grid gap-2">
                  {(
                    [
                      ["facebook", "קישור פייסבוק", "https://www.facebook.com/..."],
                      ["instagram", "קישור אינסטגרם", "https://www.instagram.com/..."],
                      ["tiktok", "קישור טיקטוק", "https://www.tiktok.com/..."],
                      [
                        "whatsappGroup",
                        "קישור קבוצת קונים בוואטסאפ",
                        "https://chat.whatsapp.com/...",
                      ],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
                      <input
                        className="field"
                        dir="ltr"
                        value={agentForm[key]}
                        onChange={(e) => setAgentForm({ ...agentForm, [key]: e.target.value })}
                        placeholder={placeholder}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={
                  busy ||
                  !agentForm.slug.trim() ||
                  !agentForm.agentName.trim() ||
                  (agentModal.mode === "invite" && !agentForm.email.trim())
                }
                className="flex-1 rounded-xl bg-sun py-3 text-sm font-bold text-sun-foreground disabled:opacity-60"
                onClick={async () => {
                  const modal = agentModal;
                  const f = agentForm;
                  const social = {
                    facebook: f.facebook,
                    instagram: f.instagram,
                    tiktok: f.tiktok,
                    whatsappGroup: f.whatsappGroup,
                  };
                  setAgentModal(null);
                  if (modal.mode === "invite") {
                    await run(async () => {
                      const res = await inviteAgent({
                        data: {
                          email: f.email,
                          slug: f.slug,
                          agentName: f.agentName,
                          roleTitle: f.roleTitle,
                          phone: f.phone,
                          photoUrl: f.photoUrl,
                          social,
                        },
                      });
                      if (res.inviteNote) setMsg(res.inviteNote);
                    }, `הסוכן נוסף והדף האישי הוקם בכתובת /${f.slug}`);
                  } else {
                    await run(
                      () =>
                        createAgent({
                          data: {
                            userId: modal.user.id,
                            slug: f.slug,
                            agentName: f.agentName,
                            roleTitle: f.roleTitle,
                            phone: f.phone,
                            email: f.email,
                            photoUrl: f.photoUrl,
                            social,
                          },
                        }),
                      `הדף האישי הוקם בכתובת /${f.slug}`,
                    );
                  }
                }}
              >
                {agentModal.mode === "invite" ? "הוספת הסוכן" : "הקמת הדף"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-primary/30 px-5 py-3 text-sm font-bold text-primary"
                onClick={() => setAgentModal(null)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

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
              החשבון וכל הנתונים שלו (פרופילי חיפוש והתראות) יימחקו לצמיתות. להמשך, הקלידו את המייל
              של המשתמש:
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
                disabled={
                  busy ||
                  confirmEmail.trim().toLowerCase() !== (deleteTarget.email ?? "").toLowerCase()
                }
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-60"
                onClick={async () => {
                  const t = deleteTarget;
                  const email = confirmEmail;
                  setDeleteTarget(null);
                  setConfirmEmail("");
                  if (openId === t.id) setOpenId(null);
                  await run(
                    () => deleteUser({ data: { userId: t.id, confirmEmail: email } }),
                    "המשתמש נמחק",
                  );
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
