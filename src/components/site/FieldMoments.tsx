import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, PlayCircle } from "lucide-react";
import { LOCALE_META, useLang } from "@/lib/i18n";
import type { FieldCategory, FieldMediaItem } from "@/lib/field-media.functions";
import { Reveal } from "./Reveal";

/* ============================================================
 * "מהשטח" — סרטונים ותמונות מעסקאות אמיתיות: חתימות, מסירת מפתחות,
 * לקוחות מרוצים, המשרד. הפריטים מגיעים מטבלת field_media (כבר בשפת
 * הדף); כשאין פריטים המדור אינו מוצג כלל.
 * ============================================================ */

type Props = { items: FieldMediaItem[] };

export function FieldMoments({ items }: Props) {
  const { t, lang } = useLang();
  const [category, setCategory] = useState<FieldCategory | "all">("all");

  // הקטגוריות הקיימות בפועל — בסדר הופעתן במילון
  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return (Object.keys(t.field.categories) as FieldCategory[]).filter((c) => present.has(c));
  }, [items, t.field.categories]);

  const visible = useMemo(
    () => (category === "all" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );

  if (items.length === 0) return null;

  const dateFor = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(LOCALE_META[lang].intl, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <section id="field" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.field.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.field.title}</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t.field.subtitle}</p>

      {categories.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t.field.kicker}>
          {(["all", ...categories] as const).map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                  active
                    ? "bg-sun text-sun-foreground"
                    : "border border-border bg-card text-primary hover:bg-secondary"
                }`}
              >
                {c === "all" ? t.field.all : t.field.categories[c]}
              </button>
            );
          })}
        </div>
      )}

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item, i) => (
          <li key={item.id} className="h-full">
            <Reveal delay={Math.min(i, 5) * 60} className="h-full">
              <article className="soft-card flex h-full flex-col overflow-hidden">
                {item.mediaKind === "video" ? (
                  <LazyVideo
                    src={item.mediaUrl}
                    poster={item.posterUrl}
                    title={item.title}
                    unsupported={t.field.videoUnsupported}
                  />
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <span className="self-start rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                    {t.field.categories[item.category] ?? t.field.categories.other}
                  </span>
                  <h3 className="mt-2 text-base font-bold text-primary">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {dateFor(item.happenedAt) && (
                    <p className="mt-auto flex items-center gap-1 pt-3 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5 text-sun" aria-hidden="true" />
                      <time dateTime={item.happenedAt ?? undefined}>
                        {dateFor(item.happenedAt)}
                      </time>
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * נגן וידאו עצל — ה-<video> נוצר רק כשהכרטיס נכנס לאזור התצוגה, כדי לא
 * למשוך מטא-דאטה של כל הסרטונים בטעינת הדף. עד אז מוצג הפוסטר (או משטח ריק).
 */
function LazyVideo({
  src,
  poster,
  title,
  unsupported,
}: {
  src: string;
  poster: string | null;
  title: string;
  unsupported: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <div ref={ref} className="relative aspect-[4/3] w-full bg-secondary">
      {inView ? (
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster ?? undefined}
          title={title}
          className="size-full object-cover"
        >
          <source src={src} />
          {unsupported}
        </video>
      ) : (
        <>
          {poster && <img src={poster} alt="" loading="lazy" className="size-full object-cover" />}
          <span className="absolute inset-0 flex items-center justify-center">
            <PlayCircle
              className="size-14 text-primary-foreground drop-shadow"
              aria-hidden="true"
            />
          </span>
        </>
      )}
    </div>
  );
}
