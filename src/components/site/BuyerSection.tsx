import { useState } from "react";
import { Users } from "lucide-react";
import { business, neighborhoods, whatsappLink } from "@/lib/site-data";
import { isValidIsraeliPhone, phoneError } from "@/lib/leads";

export function BuyerSection() {
  const [form, setForm] = useState({ name: "", phone: "", budget: "", rooms: "", area: "" });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("נא להזין שם");
    if (!isValidIsraeliPhone(form.phone)) return setErr(phoneError);
    setErr(null);
    const msg = `שלום ${business.name},\nאני מחפש נכס לפי דרישה.\nשם: ${form.name}\nטלפון: ${form.phone}\nתקציב: ${form.budget || "לא צוין"}\nחדרים: ${form.rooms || "לא צוין"}\nאזור מועדף: ${form.area || "לא צוין"}`;
    window.open(whatsappLink(msg), "_blank", "noopener,noreferrer");
  };

  return (
    <section id="buyers" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold text-sun">קונים דירה?</p>
      <h2 className="mt-2 text-3xl md:text-4xl">נכסים שמגיעים אליכם לפני שהם מגיעים ליד2</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-foreground">
        חברי קבוצת "{business.whatsappGroup.name}" מקבלים את הנכסים החדשים שלנו ראשונים.
        ההצטרפות חינם.
      </p>

      <a
        href={business.whatsappGroup.url1}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-4 text-lg font-bold text-whatsapp-foreground shadow-lift sm:w-auto"
      >
        <Users className="size-6" aria-hidden="true" />
        להצטרפות לקבוצת הנכסים
      </a>
      <p className="mt-2 text-xs text-muted-foreground">
        הקבוצה מלאה?{" "}
        <a
          href={business.whatsappGroup.url2}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-primary underline"
        >
          הצטרפו לקבוצה השנייה
        </a>
      </p>

      <form
        onSubmit={submit}
        noValidate
        className="soft-card mt-8 p-5"
        aria-label="טופס נכס לפי דרישה"
      >
        <h3 className="text-xl">נכס לפי דרישה</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          ספרו לנו מה אתם מחפשים ונעדכן אתכם ברגע שנכס מתאים מגיע.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">שם מלא</span>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">טלפון</span>
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
            <span className="mb-1 block text-xs font-bold text-muted-foreground">תקציב</span>
            <select className="field" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}>
              <option value="">בחירה</option>
              <option>עד 1,500,000 ₪</option>
              <option>1,500,000 – 2,000,000 ₪</option>
              <option>2,000,000 ₪ ומעלה</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">חדרים</span>
            <select className="field" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })}>
              <option value="">בחירה</option>
              {["2", "3", "3.5", "4", "5 ומעלה"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">אזור מועדף</span>
            <select className="field" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
              <option value="">בחירה</option>
              {neighborhoods.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {err && (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            {err}
          </p>
        )}
        <button type="submit" className="mt-4 w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground">
          שליחת הפרטים
        </button>
      </form>
    </section>
  );
}
