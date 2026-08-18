import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Facebook, Copy, ExternalLink, Megaphone, Users, RefreshCw } from "lucide-react";
import {
  getFacebookStatus,
  disconnectFacebook,
  getListingPostCopy,
  publishListingToFacebookPage,
  createFacebookCampaign,
  listFacebookGroups,
  addFacebookGroup,
  deleteFacebookGroup,
  listListingPosts,
} from "@/lib/facebook.functions";
import { formatListingPrice, listingImages, type Listing } from "@/lib/listings";

const MARKETPLACE_URL = "https://www.facebook.com/marketplace/create/item";

type Props = { siteId: string; listings: Listing[] };

/**
 * טאב "פרסום": חיבור עמוד פייסבוק, פרסום אוטומטי לעמוד, קמפיין ממומן
 * (נוצר תמיד במצב Paused), ותהליך ידני מונחה לקבוצות ולמרקטפלייס —
 * ידני כי Meta סגרה את ה-API של הקבוצות (2024) ולמרקטפלייס אין API ציבורי.
 */
export function AdminPublish({ siteId, listings }: Props) {
  const fetchStatus = useServerFn(getFacebookStatus);
  const disconnect = useServerFn(disconnectFacebook);
  const fetchCopy = useServerFn(getListingPostCopy);
  const publishPage = useServerFn(publishListingToFacebookPage);
  const createCampaign = useServerFn(createFacebookCampaign);
  const fetchGroups = useServerFn(listFacebookGroups);
  const addGroup = useServerFn(addFacebookGroup);
  const removeGroup = useServerFn(deleteFacebookGroup);
  const fetchPosts = useServerFn(listListingPosts);

  const status = useQuery({
    queryKey: ["fb-status", siteId],
    queryFn: () => fetchStatus({ data: { siteId } }),
  });
  const groups = useQuery({
    queryKey: ["fb-groups", siteId],
    queryFn: () => fetchGroups({ data: { siteId } }),
  });

  const [listingId, setListingId] = useState("");
  const selected = useMemo(
    () => listings.filter((l) => l.id === listingId)[0] ?? null,
    [listings, listingId],
  );

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copyVariants, setCopyVariants] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const [groupForm, setGroupForm] = useState({ name: "", url: "" });
  const [campaign, setCampaign] = useState({
    dailyBudgetIls: "50",
    durationDays: "7",
    radiusKm: "15",
    ageMin: "25",
    ageMax: "65",
  });

  const posts = useQuery({
    queryKey: ["fb-posts", listingId],
    queryFn: () => fetchPosts({ data: { listingId } }),
    enabled: Boolean(listingId),
  });

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const loadCopy = (force: boolean) =>
    run(async () => {
      const res = await fetchCopy({ data: { listingId, force } });
      setCopyVariants(res.variants);
      setHashtags(res.hashtags);
      setMessage(`${res.variants[0] ?? ""}\n\n${res.hashtags.join(" ")}`);
    }, "הנוסחים מוכנים");

  const fullText = message.trim();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const st = status.data;

  return (
    <section className="mt-6 space-y-6">
      {/* חיבור עמוד */}
      <div className="soft-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Facebook className="size-5 text-sun" aria-hidden="true" />
          חיבור לפייסבוק
        </h2>
        {status.isLoading && <p className="mt-2 text-sm text-muted-foreground">בודק חיבור…</p>}
        {st && !st.configured && (
          <p className="mt-2 text-sm text-muted-foreground">
            חיבור פייסבוק עדיין לא הוגדר במערכת (נדרשים META_APP_ID, META_APP_SECRET,
            META_REDIRECT_URI ואישור App Review של Meta). עד אז אפשר להשתמש במסך &quot;פוסט
            מוכן&quot; ולהעתיק ידנית.
          </p>
        )}
        {st?.configured && !st.connected && st.authUrl && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              חברו את העמוד העסקי שלכם כדי לפרסם נכסים בלחיצה ולהקים קמפיינים.
            </p>
            <a
              href={st.authUrl}
              className="mt-3 inline-block rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-sun-foreground"
            >
              חיבור עמוד פייסבוק
            </a>
          </div>
        )}
        {st?.connected && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1 font-bold text-primary">
              מחובר לעמוד: {st.pageName}
            </span>
            {st.hasAdAccount ? (
              <span className="text-muted-foreground">חשבון מודעות מחובר ✓</span>
            ) : (
              <span className="text-muted-foreground">אין חשבון מודעות (קמפיינים לא זמינים)</span>
            )}
            <button
              type="button"
              disabled={busy}
              className="text-destructive underline"
              onClick={() =>
                run(async () => {
                  await disconnect({ data: { siteId } });
                  await status.refetch();
                }, "החיבור נותק")
              }
            >
              ניתוק
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p className="rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">{msg}</p>
      )}
      {err && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {err}
        </p>
      )}

      {/* בחירת נכס */}
      <div className="soft-card p-5">
        <h2 className="text-lg font-extrabold text-primary">פרסום נכס</h2>
        <label className="mt-3 block max-w-lg">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">בחרו נכס</span>
          <select
            className="field"
            value={listingId}
            onChange={(e) => {
              setListingId(e.target.value);
              setCopyVariants([]);
              setHashtags([]);
              setMessage("");
            }}
          >
            <option value="">בחירה…</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} · {formatListingPrice(l.price)}
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <div className="mt-4 space-y-4">
            {/* נוסח הפוסט */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => loadCopy(false)}
                  className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground disabled:opacity-60"
                >
                  הכינו לי נוסח פוסט
                </button>
                {copyVariants.length > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => loadCopy(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary disabled:opacity-60"
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    נוסחים חדשים
                  </button>
                )}
              </div>

              {copyVariants.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {copyVariants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMessage(`${v}\n\n${hashtags.join(" ")}`)}
                      className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
                    >
                      נוסח {i + 1}
                    </button>
                  ))}
                </div>
              )}

              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  נוסח הפוסט (ניתן לעריכה)
                </span>
                <textarea
                  className="field min-h-40"
                  value={message}
                  maxLength={4000}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="לחצו על 'הכינו לי נוסח פוסט' או כתבו נוסח משלכם"
                />
              </label>
            </div>

            {/* פרסום לעמוד — אוטומטי */}
            <div className="rounded-xl border border-border p-4">
              <h3 className="font-bold text-primary">פרסום לעמוד העסקי — אוטומטי</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                הפוסט יעלה לעמוד המחובר עם כל תמונות הנכס.
              </p>
              <button
                type="button"
                disabled={busy || !st?.connected || !fullText}
                onClick={() =>
                  run(async () => {
                    await publishPage({ data: { listingId, message: fullText } });
                    await posts.refetch();
                  }, "הפוסט פורסם לעמוד בהצלחה")
                }
                className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                פרסום לעמוד עכשיו
              </button>
              {!st?.connected && (
                <p className="mt-2 text-xs text-muted-foreground">נדרש חיבור עמוד (למעלה).</p>
              )}
            </div>

            {/* קבוצות ומרקטפלייס — ידני */}
            <div className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-1.5 font-bold text-primary">
                <Users className="size-4 text-sun" aria-hidden="true" />
                קבוצות נדל&quot;ן ומרקטפלייס — פוסט מוכן בלחיצה
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                שלב זה ידני במכוון: Meta סגרה את ה-API לפרסום בקבוצות (אפריל 2024) ולמרקטפלייס אין
                API ציבורי — אף כלי אינו יכול לפרסם לשם אוטומטית. לכן מכינים לכם הכול להעתקה:
                מעתיקים את הנוסח, פותחים את הקבוצה או את המרקטפלייס, מדביקים ומצרפים את התמונות.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!fullText}
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground disabled:opacity-60"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  {copied ? "הועתק ✓" : "העתקת הנוסח"}
                </button>
                <a
                  href={MARKETPLACE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  פתיחת מרקטפלייס
                </a>
                {listingImages(selected).map((src, i) => (
                  <a
                    key={src}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-primary"
                  >
                    תמונה {i + 1}
                  </a>
                ))}
              </div>

              {/* הקבוצות השמורות */}
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground">הקבוצות שלי</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(groups.data ?? []).map((g) => (
                    <li
                      key={g.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm"
                    >
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-primary underline"
                      >
                        {g.name}
                      </a>
                      <button
                        type="button"
                        aria-label={`הסרת הקבוצה ${g.name}`}
                        className="text-destructive"
                        onClick={() =>
                          run(async () => {
                            await removeGroup({ data: { id: g.id } });
                            await groups.refetch();
                          }, "הקבוצה הוסרה")
                        }
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  {(groups.data ?? []).length === 0 && (
                    <li className="text-xs text-muted-foreground">
                      עדיין אין קבוצות שמורות — הוסיפו את הקבוצות שאתם מפרסמים בהן.
                    </li>
                  )}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    className="field max-w-40"
                    placeholder="שם הקבוצה"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  />
                  <input
                    className="field max-w-72"
                    dir="ltr"
                    placeholder="https://www.facebook.com/groups/..."
                    value={groupForm.url}
                    onChange={(e) => setGroupForm({ ...groupForm, url: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={busy || !groupForm.name.trim() || !groupForm.url.trim()}
                    className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary disabled:opacity-60"
                    onClick={() =>
                      run(async () => {
                        await addGroup({ data: { siteId, ...groupForm } });
                        setGroupForm({ name: "", url: "" });
                        await groups.refetch();
                      }, "הקבוצה נוספה")
                    }
                  >
                    הוספה
                  </button>
                </div>
              </div>
            </div>

            {/* קמפיין ממומן */}
            <div className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-1.5 font-bold text-primary">
                <Megaphone className="size-4 text-sun" aria-hidden="true" />
                קמפיין ממומן — נוצר במצב מושהה (Paused)
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                הקמפיין נבנה ב-Ads Manager אך לעולם לא מופעל מכאן — ההפעלה (וההוצאה הכספית) נעשית
                ידנית בחשבון המודעות שלכם.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    ["dailyBudgetIls", "תקציב יומי (₪)"],
                    ["durationDays", "משך (ימים)"],
                    ["radiusKm", 'רדיוס מנתניה (ק"מ)'],
                    ["ageMin", "גיל מינימום"],
                    ["ageMax", "גיל מקסימום"],
                  ] as Array<[keyof typeof campaign, string]>
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      {label}
                    </span>
                    <input
                      className="field"
                      type="number"
                      dir="ltr"
                      value={campaign[key]}
                      onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || !st?.connected || !st?.hasAdAccount || !fullText}
                onClick={() =>
                  run(async () => {
                    const res = await createCampaign({
                      data: {
                        listingId,
                        message: fullText,
                        params: {
                          dailyBudgetIls: Number(campaign.dailyBudgetIls),
                          durationDays: Number(campaign.durationDays),
                          radiusKm: Number(campaign.radiusKm),
                          ageMin: Number(campaign.ageMin),
                          ageMax: Number(campaign.ageMax),
                        },
                      },
                    });
                    await posts.refetch();
                    window.open(res.adsManagerUrl, "_blank", "noopener,noreferrer");
                  }, "הקמפיין נוצר במצב מושהה — נפתח Ads Manager להפעלה")
                }
                className="mt-3 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-navy-foreground disabled:opacity-60"
              >
                יצירת קמפיין מושהה
              </button>
            </div>

            {/* יומן פרסומים */}
            {(posts.data ?? []).length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <h3 className="font-bold text-primary">יומן פרסומים לנכס</h3>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {(posts.data ?? []).map((p) => (
                    <li key={p.id}>
                      {new Date(p.created_at).toLocaleString("he-IL")} ·{" "}
                      {p.target === "page" ? "עמוד" : p.target === "campaign" ? "קמפיין" : "ידני"} ·{" "}
                      {p.status === "success" ? "הצליח" : `נכשל: ${p.error ?? ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
