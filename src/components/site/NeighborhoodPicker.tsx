import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { neighborhoods } from "@/lib/site-data";
import { useLang } from "@/lib/i18n";

/**
 * בחירת שכונות — פקד מקופל: כפתור בסגנון שדה שמציג "בחירת שכונות" או
 * "N שכונות נבחרו", ובלחיצה נפתח לוח צ'יפים מרובה-בחירה עם "בחירת הכול",
 * "ניקוי" ו"סיום". משותף לסינון הנכסים, לטופס הקונים ולפרופיל החיפוש.
 */
type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** תווית מעל השדה (אופציונלי) */
  label?: string;
};

export function NeighborhoodPicker({ value, onChange, label }: Props) {
  const { t, dir } = useLang();
  const [open, setOpen] = useState(false);

  const toggle = (n: string) =>
    onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);

  const summary = value.length ? t.search.areasSelected(value.length) : t.search.pickAreas;

  return (
    <div className="block">
      {label && <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label ?? t.search.pickAreas}
            className="field flex items-center justify-between gap-2 text-start"
          >
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-sun" aria-hidden="true" />
              <span className="truncate">{summary}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {value.length > 0 && (
                <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-extrabold text-sun-foreground">
                  {value.length}
                </span>
              )}
              <ChevronDown
                className={`size-4 text-primary transition ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          dir={dir}
          align="start"
          className="w-[min(36rem,calc(100vw-2rem))] rounded-xl p-3"
        >
          <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
            {neighborhoods.map((n) => {
              const on = value.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggle(n)}
                  aria-pressed={on}
                  className={
                    on
                      ? "rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground"
                      : "rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {t.maps.neighborhoods[n] ?? n}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange([...neighborhoods])}
                className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary"
              >
                {t.search.selectAll}
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={value.length === 0}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground disabled:opacity-50"
              >
                {t.search.clear}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-sun px-4 py-1.5 text-xs font-bold text-sun-foreground"
            >
              {t.search.done}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
