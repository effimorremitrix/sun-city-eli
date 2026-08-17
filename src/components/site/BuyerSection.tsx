import { useState } from "react";
import { Users } from "lucide-react";
import { business, neighborhoods, openWa } from "@/lib/site-data";
import { isValidIsraeliPhone } from "@/lib/leads";
import { useLang } from "@/lib/i18n";

export function BuyerSection() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", budget: "", rooms: "", area: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.buyers.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(t.misc.phoneError);
    setErr(null);
    openWa(
      t.buyers.waMsg(business.name, {
        name: form.name,
        phone: form.phone,
        budget: form.budget || t.buyers.notSpecified,
        rooms: form.rooms || t.buyers.notSpecified,
        area: form.area || t.buyers.notSpecified,
      }),
    );
  };

  return (
    <section id="buyers" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">{t.buyers.kicker}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{t.buyers.title}</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-foreground">
        {t.buyers.text(business.whatsappGroup.name)}
      </p>

      <a
        href={business.whatsappGroup.url1}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-4 text-lg font-bold text-whatsapp-foreground shadow-lift sm:w-auto"
      >
        <Users className="size-6" aria-hidden="true" />
        {t.buyers.joinGroup}
      </a>
      <p className="mt-2 text-xs text-muted-foreground">
        {t.buyers.groupFullQ}{" "}
        <a
          href={business.whatsappGroup.url2}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-primary underline"
        >
          {t.buyers.secondGroup}
        </a>
      </p>

      <form
        onSubmit={submit}
        noValidate
        className="soft-card mt-8 p-5"
        aria-label={t.buyers.formAria}
      >
        <h3 className="text-xl">{t.buyers.formTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t.buyers.formText}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.fullName}
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
              {t.buyers.phone}
            </span>
            <input
              className="field"
              type="tel"
              inputMode="tel"
              placeholder={t.buyers.phonePlaceholder}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.budget}
            </span>
            <select
              className="field"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            >
              <option value="">{t.buyers.choose}</option>
              {t.buyers.budgetOptions.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.rooms}
            </span>
            <select
              className="field"
              value={form.rooms}
              onChange={(e) => setForm({ ...form, rooms: e.target.value })}
            >
              <option value="">{t.buyers.choose}</option>
              {t.buyers.roomsOptions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.preferredArea}
            </span>
            <select
              className="field"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            >
              <option value="">{t.buyers.choose}</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {t.maps.neighborhoods[n] ?? n}
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
          className="mt-4 w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground"
        >
          {t.buyers.submit}
        </button>
      </form>
    </section>
  );
}
