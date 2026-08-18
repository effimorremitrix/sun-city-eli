import { useState } from "react";
import { ClipboardList, Home, FileCheck2 } from "lucide-react";
import { business, openWa } from "@/lib/site-data";
import { isValidIsraeliPhone } from "@/lib/leads";
import { useLang } from "@/lib/i18n";

const stepIcons = [ClipboardList, Home, FileCheck2];

export function SellerSection() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", address: "", rooms: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.sellers.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(t.misc.phoneError);
    if (!form.address.trim()) return setErr(t.sellers.errAddress);
    setErr(null);
    openWa(
      t.sellers.waMsg(business.name, {
        name: form.name,
        phone: form.phone,
        address: form.address,
        rooms: form.rooms || t.sellers.notSpecified,
      }),
    );
  };

  return (
    <section id="sellers" className="bg-navy py-14 text-navy-foreground md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold text-sun">{t.sellers.kicker}</p>
        <h2 className="mt-2 text-3xl text-navy-foreground md:text-4xl">{t.sellers.title}</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-navy-foreground/85">{t.sellers.text}</p>

        <p className="mt-4 inline-flex rounded-xl bg-[oklch(1_0_0/0.1)] px-4 py-2 text-sm font-bold text-sun">
          {t.whyUs.successFeeNote}
        </p>

        <form
          onSubmit={submit}
          noValidate
          className="mt-7 rounded-2xl bg-card p-5 shadow-lift"
          aria-label={t.sellers.formAria}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.sellers.fullName}
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
                {t.sellers.phone}
              </span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                placeholder={t.sellers.phonePlaceholder}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.sellers.address}
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
                {t.sellers.roomsCount}
              </span>
              <select
                className="field"
                value={form.rooms}
                onChange={(e) => setForm({ ...form, rooms: e.target.value })}
              >
                <option value="">{t.sellers.choose}</option>
                {t.sellers.roomsOptions.map((r) => (
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
            {t.sellers.submit}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.sellers.privacyNote}</p>
        </form>

        <ol className="mt-7 grid gap-4 sm:grid-cols-3">
          {t.sellers.steps.map(({ title, text }, i) => {
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
