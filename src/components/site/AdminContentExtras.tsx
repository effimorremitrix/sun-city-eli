import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, MessageSquareQuote, Plus, Trash2 } from "lucide-react";
import { saveSiteContent } from "@/lib/site.functions";
import type { LiveFaqItem } from "@/lib/site-live";
import { DICTS } from "@/lib/i18n";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** עורך רשימות גנרי: הזזה למעלה/למטה ומחיקה */
function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item!);
  return copy;
}

/**
 * שאלות נפוצות — טאב "תוכן העסק". כשאין תוכן שמור במסד, האתר מציג את
 * התוכן הסטטי; אפשר לייבא אותו כבסיס לעריכה. הטקסטים מתורגמים אוטומטית
 * לשפות האתר בשמירה (ראו saveSiteContent).
 *
 * הממליצים עברו מכאן לטאב "ממליצים" (טבלת testimonials עם היקף הצגה:
 * כללי / סוכן / כמה סוכנים) — כאן נשאר רק כרטיס הפניה.
 */
export function AdminContentExtras({
  siteId,
  faq,
  onSaved,
}: {
  siteId: string;
  faq: LiveFaqItem[] | null;
  onSaved: () => void;
}) {
  const saveContent = useServerFn(saveSiteContent);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { site?: string };
  const tHe = DICTS.he;

  const [faqItems, setFaqItems] = useState<LiveFaqItem[]>(faq ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFaqItems(faq ?? []);
  }, [faq]);

  const goToTestimonials = () =>
    void navigate({
      to: "/account",
      search: { tab: "testimonials", ...(search.site ? { site: search.site } : {}) },
    });

  const seedFaq = () => setFaqItems(tHe.faq.items.map((f) => ({ id: newId(), q: f.q, a: f.a })));

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await saveContent({
        data: {
          siteId,
          // רשימה ריקה = חזרה לתוכן הסטטי של האתר; הממליצים לא נשלחים — לא נוגעים בהם
          faq: faqItems.length ? faqItems : null,
        },
      });
      setMsg("השאלות הנפוצות נשמרו — השינויים באתר מיידיים, והתרגומים נוצרו אוטומטית.");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const rowButtons = (onUp: () => void, onDown: () => void, onDelete: () => void) => (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        aria-label="הזזה למעלה"
        onClick={onUp}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="הזזה למטה"
        onClick={onDown}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="מחיקה"
        onClick={onDelete}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-destructive/40 text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      {/* ---------- הפניה לטאב הממליצים ---------- */}
      <section className="soft-card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <MessageSquareQuote className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden="true" />
          <div>
            <h2 className="text-base font-extrabold text-primary">ממליצים</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              הממליצים עברו לטאב 'ממליצים' (עם בחירת היקף: כללי / סוכן / כמה סוכנים)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={goToTestimonials}
          className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-sun-foreground"
        >
          לטאב הממליצים
        </button>
      </section>

      {/* ---------- שאלות נפוצות ---------- */}
      <section className="soft-card mt-6 p-5">
        <h2 className="text-lg font-extrabold text-primary">שאלות נפוצות</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          התוכן כאן מחליף את השאלות הקבועות של האתר. רשימה ריקה = האתר חוזר לתוכן הקבוע. הטקסטים
          מתורגמים אוטומטית לאנגלית, צרפתית ורוסית בשמירה.
        </p>

        {msg && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">
            {msg}
          </p>
        )}
        {err && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
          >
            {err}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <div className="flex gap-2 text-sm">
            {faqItems.length === 0 && (
              <button type="button" className="underline" onClick={seedFaq}>
                ייבוא השאלות הקיימות באתר
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 font-bold text-primary"
              onClick={() => setFaqItems([...faqItems, { id: newId(), q: "", a: "" }])}
            >
              <Plus className="size-4" aria-hidden="true" />
              הוספת שאלה
            </button>
          </div>
        </div>

        <ul className="mt-3 grid gap-3">
          {faqItems.map((f, i) => (
            <li key={f.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">שאלה</span>
                    <input
                      className="field"
                      value={f.q}
                      maxLength={200}
                      onChange={(e) =>
                        setFaqItems(
                          faqItems.map((x) => (x.id === f.id ? { ...x, q: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-muted-foreground">
                      תשובה
                    </span>
                    <textarea
                      className="field min-h-20"
                      value={f.a}
                      maxLength={1000}
                      onChange={(e) =>
                        setFaqItems(
                          faqItems.map((x) => (x.id === f.id ? { ...x, a: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                </div>
                {rowButtons(
                  () => setFaqItems(moveItem(faqItems, i, -1)),
                  () => setFaqItems(moveItem(faqItems, i, 1)),
                  () => setFaqItems(faqItems.filter((x) => x.id !== f.id)),
                )}
              </div>
            </li>
          ))}
        </ul>
        {faqItems.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            אין שאלות שמורות — האתר מציג את השאלות הקבועות.
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="mt-5 w-full rounded-xl bg-sun py-3 text-base font-bold text-sun-foreground disabled:opacity-60"
        >
          {busy ? "שומר ומתרגם…" : "שמירת השאלות הנפוצות"}
        </button>
      </section>
    </>
  );
}
