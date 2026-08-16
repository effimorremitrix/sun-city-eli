import { Home } from "lucide-react";
import { DataSource } from "@/components/site/DataSource";
import { useT } from "@/lib/i18n";
import type { SoldProperty } from "@/lib/sold.functions";
import { Reveal } from "./Reveal";

type Props = { items: SoldProperty[] };

/**
 * מדור "נמכר על ידינו" — הוכחה חברתית בסגנון פוסטרי ה"נמכר" של המשרד:
 * תמונה עגולה בטבעת שמש, חותמת "נמכר" גדולה, והכתובת מתחת.
 */
export function SoldSection({ items }: Props) {
  const t = useT();
  if (items.length === 0) return null;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("he-IL", { month: "2-digit", year: "numeric" });
  };

  return (
    <section id="sold" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.sold.label}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.sold.title}</h2>
      <DataSource source="db" updatedAt={null} className="mt-2" />
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        {t.sold.subtitle(items.length)}
      </p>

      <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => (
          <li key={s.id}>
            <Reveal delay={i * 70}>
              <article className="text-center">
                <div className="relative mx-auto aspect-square w-full max-w-64">
                  {/* קרני שמש עדינות סביב הטבעת */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-full border-4 border-dashed border-sun/40"
                  />
                  {s.url ? (
                    <img
                      src={s.url}
                      alt={`${t.sold.stamp} — ${s.address}`}
                      width={400}
                      height={400}
                      loading="lazy"
                      className="size-full rounded-full border-[6px] border-sun object-cover shadow-lift"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-full border-[6px] border-sun bg-sun/15 shadow-lift">
                      <Home className="size-20 text-sun" aria-hidden="true" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
                    <span className="rounded-full bg-navy/80 px-3 py-0.5 text-xs font-bold text-navy-foreground backdrop-blur-sm">
                      {t.sold.stampPrefix}
                    </span>
                    <span className="mt-0.5 font-display text-5xl font-extrabold leading-none text-sun [text-shadow:0_2px_6px_rgba(0,0,0,0.55)]">
                      {t.sold.stamp}
                    </span>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-extrabold text-primary">{s.address}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[
                    s.neighborhood,
                    s.sold_at && fmtDate(s.sold_at) ? t.sold.soldOn(fmtDate(s.sold_at)!) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {s.note && <p className="mt-1 text-sm font-semibold text-sun">{s.note}</p>}
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
