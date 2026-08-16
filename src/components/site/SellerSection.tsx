import { useState } from "react";
import { ClipboardList, Home, FileCheck2 } from "lucide-react";
import { business, openWa } from "@/lib/site-data";
import { useLive } from "@/lib/site-live";
import { useT } from "@/lib/i18n";
import { isValidIsraeliPhone, phoneError } from "@/lib/leads";

const stepIcons = [ClipboardList, Home, FileCheck2];

export function SellerSection() {
  const { business: live } = useLive();
  const t = useT();
  const [form, setForm] = useState({ name: "", phone: "", address: "", rooms: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.seller.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(phoneError);
    if (!form.address.trim()) return setErr(t.seller.errAddress);
    setErr(null);
    const msg = `שלום ${live.agentName},\nאני מעוניין בהערכת שווי חינם לנכס שלי.\nשם: ${form.name}\nטלפון: ${form.phone}\nכתובת הנכס: ${form.address}\nמספר חדרים: ${form.rooms || "לא צוין"}`;
    openWa(msg, live.phoneTel);
  };

  return (
    <section id="sellers" className="bg-navy py-14 text-navy-foreground md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">{t.seller.label}</p>
        <h2 className="mt-2 text-3xl text-navy-foreground md:text-4xl">{t.seller.title}</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-navy-foreground/85">{t.seller.subtitle}</p>

        <p className="mt-4 inline-flex rounded-xl bg-[oklch(1_0_0/0.1)] px-4 py-2 text-sm font-bold text-sun">
          {business.successFeeNote}
        </p>

        <form
          onSubmit={submit}
          noValidate
          className="mt-7 rounded-2xl bg-card p-5 shadow-lift"
          aria-label={t.seller.formLabel}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.seller.fullName}
              </span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.seller.phone}
              </span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                placeholder="050-1234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.seller.address}
              </span>
              <input
                className="field"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.seller.rooms}
              </span>
              <select
                className="field"
                value={form.rooms}
                onChange={(e) => setForm({ ...form, rooms: e.target.value })}
              >
                <option value="">{t.seller.choose}</option>
                {["2", "2.5", "3", "3.5", "4", "4.5", "5", "6 ומעלה"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {err && (
            <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
              {err}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-sun py-3.5 text-base font-bold text-sun-foreground"
          >
            {t.seller.submit}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.seller.note}</p>
        </form>

        <ol className="mt-7 grid gap-4 sm:grid-cols-3">
          {t.seller.steps.map(({ title, text }, i) => {
            const Icon = stepIcons[i] ?? ClipboardList;
            return (
              <li key={title} className="rounded-xl bg-[oklch(1_0_0/0.08)] p-4">
                <Icon className="size-6 text-sun" aria-hidden="true" />
                <p className="mt-2 font-display font-bold text-navy-foreground">
                  {i + 1}. {title}
                </p>
                <p className="mt-1 text-sm text-navy-foreground/80">{text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
