import { DataSource } from "@/components/site/DataSource";
import { useState } from "react";
import { ChevronRight, ChevronLeft, Quote, Plus, Minus, PlayCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useLive, type LiveTestimonial } from "@/lib/site-live";
import { isVideoUrl } from "@/lib/media";

/** חילוץ מזהה סרטון YouTube מקישור (watch / youtu.be / shorts / embed) */
const youTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts)\/([\w-]{6,})/);
      if (m) return m[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
};

/** פריט ממליץ — מהמסד (עם מדיה) או מהמילון הסטטי (טקסט בלבד) */
type TestimonialLike = Pick<LiveTestimonial, "name" | "type" | "quote"> &
  Partial<Pick<LiveTestimonial, "mediaKind" | "videoUrl" | "imageUrl" | "posterUrl">>;

/** סוג המדיה בפועל — המלצות ישנות בלי mediaKind נגזרות מהקישור השמור */
const mediaKindOf = (item: TestimonialLike): NonNullable<LiveTestimonial["mediaKind"]> =>
  item.mediaKind ?? (item.videoUrl ? "video" : item.imageUrl ? "image" : "text");

export function Testimonials() {
  const { dir, t } = useLang();
  const live = useLive();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  // תוכן שנשמר באזור הניהול מנצח; אחרת התוכן הקבוע מהמילון
  const items: TestimonialLike[] = live.testimonials?.length
    ? live.testimonials
    : t.testimonials.items;
  const item = items[Math.min(i, items.length - 1)]!;
  const kind = mediaKindOf(item);
  const videoUrl = kind === "video" ? (item.videoUrl ?? "") : "";
  const imageUrl = kind === "image" ? (item.imageUrl ?? "") : "";
  const posterUrl = item.posterUrl ?? "";
  const videoId = videoUrl ? youTubeId(videoUrl) : null;
  // קובץ סרטון (mp4/webm/mov) — הועלה מאזור הניהול או קישור ישיר; מנוגן בנגן מובנה
  const fileVideo = videoUrl ? isVideoUrl(videoUrl) : false;
  // תמונת פתיחה ל-YouTube: מהניהול, ואם אין — התמונה של YouTube עצמו
  const youTubePoster =
    videoId && (posterUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);

  const go = (fn: (v: number) => number) => {
    setPlaying(false);
    setI((v) => fn(v));
  };
  const prev = () => go((v) => (v - 1 + items.length) % items.length);
  const next = () => go((v) => (v + 1) % items.length);

  return (
    <section id="testimonials" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.testimonials.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.testimonials.title}</h2>
      <DataSource updatedAt={live.testimonials?.length ? live.updatedAt : null} className="mt-2" />

      <div className="soft-card mt-6 p-6">
        {/* המלצה עם תמונה — התמונה מעל הציטוט */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={t.testimonials.imageAlt(item.name)}
            loading="lazy"
            className="mb-4 max-h-80 w-full rounded-xl border border-border object-cover"
          />
        )}

        <Quote className="size-7 text-sun" aria-hidden="true" />
        <blockquote className="mt-3 text-lg leading-relaxed text-foreground">
          "{item.quote}"
        </blockquote>
        <p className="mt-4 font-bold text-primary">
          {item.name} <span className="font-normal text-muted-foreground">· {item.type}</span>
        </p>

        {/* סרטון המלצה — קובץ מנוגן מיד בנגן מובנה; YouTube נפתח בלחיצה; אחר — קישור */}
        {videoUrl &&
          (fileVideo ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              {/* object-contain על רקע כהה כדי שסרטון אנכי מהנייד יוצג יפה */}
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={posterUrl || undefined}
                className="aspect-video w-full bg-primary object-contain"
              />
            </div>
          ) : playing && videoId ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <iframe
                title={`${t.testimonials.title} — ${item.name}`}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            </div>
          ) : videoId ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative mt-4 block w-full overflow-hidden rounded-xl border border-border bg-primary"
              aria-label={t.testimonials.watchVideo}
            >
              <img
                src={youTubePoster || undefined}
                alt=""
                loading="lazy"
                className="aspect-video w-full object-cover opacity-90 transition group-hover:opacity-100"
              />
              <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold text-white">
                <PlayCircle className="size-12 text-sun drop-shadow" aria-hidden="true" />
              </span>
            </button>
          ) : (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-primary underline"
            >
              <PlayCircle className="size-5 text-sun" aria-hidden="true" />
              {t.testimonials.watchVideo}
            </a>
          ))}

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-2">
            {/* החיצים פיזיים — כיוון הדפדוף מתהפך לפי כיוון השפה */}
            <button
              type="button"
              aria-label={dir === "rtl" ? t.testimonials.prevAria : t.testimonials.nextAria}
              onClick={dir === "rtl" ? prev : next}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={dir === "rtl" ? t.testimonials.nextAria : t.testimonials.prevAria}
              onClick={dir === "rtl" ? next : prev}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-primary"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.testimonials.counter(Math.min(i, items.length - 1) + 1, items.length)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useLang();
  const live = useLive();
  // כל השאלות סגורות בטעינה — הגולש פותח מה שמעניין אותו
  const [open, setOpen] = useState<number | null>(null);
  const items = live.faq?.length ? live.faq : t.faq.items;

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 pb-14 md:pb-20">
      <p className="text-sm font-bold text-sun">{t.faq.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.faq.title}</h2>

      <ul className="mt-6 space-y-3">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q} className="soft-card overflow-hidden">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-start text-base font-bold text-primary"
                >
                  {f.q}
                  {isOpen ? (
                    <Minus className="size-5 shrink-0 text-sun" aria-hidden="true" />
                  ) : (
                    <Plus className="size-5 shrink-0 text-sun" aria-hidden="true" />
                  )}
                </button>
              </h3>
              {isOpen && (
                <p className="border-t border-border p-4 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
