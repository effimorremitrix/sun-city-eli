import { useEffect, useState } from "react";
import { Accessibility, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function AccessibilityWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = big ? "118%" : "";
  }, [big]);

  useEffect(() => {
    document.documentElement.classList.toggle("contrast-boost", contrast);
  }, [contrast]);

  return (
    <div className="fixed bottom-24 end-3 z-50 lg:bottom-6">
      {open && (
        <div className="soft-card mb-2 w-56 p-3" role="group" aria-label={t.a11y.groupAria}>
          <div className="flex items-center justify-between">
            <p className="font-bold text-primary">{t.a11y.title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.a11y.closeAria}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            aria-pressed={big}
            onClick={() => setBig((v) => !v)}
            className="mt-3 w-full rounded-lg border border-border py-2 text-sm font-semibold text-primary"
          >
            {big ? t.a11y.bigOff : t.a11y.bigOn}
          </button>
          <button
            type="button"
            aria-pressed={contrast}
            onClick={() => setContrast((v) => !v)}
            className="mt-2 w-full rounded-lg border border-border py-2 text-sm font-semibold text-primary"
          >
            {contrast ? t.a11y.contrastOff : t.a11y.contrastOn}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.a11y.openAria}
        aria-expanded={open}
        className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift"
      >
        <Accessibility className="size-6" aria-hidden="true" />
      </button>
    </div>
  );
}
