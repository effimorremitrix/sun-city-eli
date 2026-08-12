import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  redeemEditLink,
  endEditSession,
  getEditWorkspace,
  saveEditContent,
  saveEditItem,
  deleteEditItem,
} from "@/lib/edit-link.functions";
import { ContentEditor } from "@/components/admin/ContentEditor";

const title = 'עריכת האתר | סאן סיטי נדל"ן';
const description = "אזור עריכת התוכן של האתר, בכניסה דרך קישור עריכה אישי.";

export const Route = createFileRoute("/edit")({
  ssr: false,
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
  component: EditPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">האזור לא נטען</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-primary">הדף לא נמצא</h1>
    </main>
  ),
});

function EditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const redeem = useServerFn(redeemEditLink);
  const endSession = useServerFn(endEditSession);
  const fetchWorkspace = useServerFn(getEditWorkspace);
  const saveContent = useServerFn(saveEditContent);
  const saveItem = useServerFn(saveEditItem);
  const removeItem = useServerFn(deleteEditItem);

  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redeemed = useRef(false);

  // מימוש הקוד מהכתובת פעם אחת, ואז ניקוי הקוד מהכתובת כדי שלא יישאר בהיסטוריה
  useEffect(() => {
    if (redeemed.current) return;
    redeemed.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("k");

    (async () => {
      if (token) {
        try {
          await redeem({ data: { token } });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "קישור העריכה אינו תקף");
        }
        window.history.replaceState({}, "", "/edit");
      }
      setReady(true);
    })();
  }, [redeem]);

  const workspace = useQuery({
    queryKey: ["edit-workspace"],
    queryFn: () => fetchWorkspace(),
    enabled: ready,
    retry: false,
  });

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await fn();
      setNote(okMsg);
      await queryClient.invalidateQueries({ queryKey: ["edit-workspace"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await endSession();
    queryClient.clear();
    navigate({ to: "/", replace: true });
  };

  if (!ready || workspace.isLoading) {
    return <main className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted-foreground">טוען…</main>;
  }

  if (workspace.isError || !workspace.data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold text-primary">אין הרשאת עריכה</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {err ??
            (workspace.error instanceof Error
              ? workspace.error.message
              : "יש לפתוח את קישור העריכה האישי שנשלח אליכם בוואטסאפ.")}
        </p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-sun px-5 py-3 text-sm font-bold text-sun-foreground">
          חזרה לאתר
        </Link>
      </main>
    );
  }

  const { site, live, items } = workspace.data;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">עריכת האתר</h1>
          <p className="mt-1 text-sm text-muted-foreground">{site.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-primary">
            לאתר
          </Link>
          <button
            type="button"
            onClick={leave}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-primary"
          >
            יציאה
          </button>
        </div>
      </div>

      {note && <p className="mt-4 rounded-lg bg-sun/15 p-3 text-sm font-bold text-primary">{note}</p>}
      {err && (
        <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {err}
        </p>
      )}

      <ContentEditor
        business={live.business}
        texts={live.texts}
        items={items}
        busy={busy}
        onSaveContent={(business, texts) =>
          run(
            () =>
              saveContent({
                data: {
                  business: business as unknown as Record<string, unknown>,
                  texts: texts as unknown as Record<string, unknown>,
                },
              }),
            "התוכן נשמר ומופיע באתר",
          )
        }
        onSaveItem={(data) => run(() => saveItem({ data }), "הפריט נשמר")}
        onDeleteItem={(id) => run(() => removeItem({ data: { id } }), "הפריט נמחק")}
      />
    </main>
  );
}
