import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { business, neighborhoods, openWa } from "@/lib/site-data";
import { PROPERTY_CATEGORIES, isValidIsraeliPhone } from "@/lib/leads";
import { createPublicLead } from "@/lib/leads.functions";
import { useLang } from "@/lib/i18n";
import { useLive } from "@/lib/site-live";
import { trackEvent } from "@/lib/analytics";

/** טופס "נכס לפי דרישה" — קריטריונים מובנים בסגנון הפילטרים של יד2 */
type BuyerForm = {
  name: string;
  phone: string;
  dealType: "קנייה" | "השכרה";
  propertyType: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  hoods: string[];
  minSize: string;
  minFloor: string;
  maxFloor: string;
  needsMamad: boolean;
  needsElevator: boolean;
  needsParking: boolean;
  needsBalcony: boolean;
};

const emptyForm: BuyerForm = {
  name: "",
  phone: "",
  dealType: "קנייה",
  propertyType: "",
  maxPrice: "",
  minRooms: "",
  maxRooms: "",
  hoods: [],
  minSize: "",
  minFloor: "",
  maxFloor: "",
  needsMamad: false,
  needsElevator: false,
  needsParking: false,
  needsBalcony: false,
};

const ROOM_STEPS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "7", "8"];

export function BuyerSection() {
  const { t } = useLang();
  const { business: live, siteId } = useLive();
  const createLead = useServerFn(createPublicLead);
  const [form, setForm] = useState<BuyerForm>(emptyForm);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  /* קבוצת הקונים של סוכן הדף (מהאזור האישי); אם לא הוזנה — קבוצות המשרד */
  const agentGroup = live.social?.whatsappGroup?.trim() || "";

  const toggleHood = (n: string) =>
    setForm((f) => ({
      ...f,
      hoods: f.hoods.includes(n) ? f.hoods.filter((x) => x !== n) : [...f.hoods, n],
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr(t.buyers.errName);
    if (!isValidIsraeliPhone(form.phone)) return setErr(t.misc.phoneError);
    setErr(null);
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const budgetText = form.maxPrice
      ? `עד ${Number(form.maxPrice).toLocaleString("he-IL")} ₪`
      : t.buyers.notSpecified;
    const roomsText =
      form.minRooms || form.maxRooms
        ? `${form.minRooms || "?"}–${form.maxRooms || "?"}`
        : t.buyers.notSpecified;
    const areaText = form.hoods.length
      ? form.hoods.map((n) => t.maps.neighborhoods[n] ?? n).join(", ")
      : t.buyers.notSpecified;
    // קליטה שקטה למודול הלידים — לפני פתיחת הוואטסאפ, בלי לחסום את הגולש.
    // הקריטריונים נשלחים מובנים: כרטיס הליד וההתאמות משתמשים בהם ישירות.
    try {
      void createLead({
        data: {
          siteId,
          name: form.name,
          phone: form.phone,
          message: `מחפש/ת נכס (${form.dealType}): תקציב ${budgetText}, חדרים ${roomsText}, אזור ${areaText}`,
          source: "טופס קונים",
          marketingConsent: consent,
          criteria: {
            deal_type: form.dealType,
            city: "נתניה",
            neighborhoods: form.hoods,
            property_type: form.propertyType || null,
            max_price: num(form.maxPrice),
            min_rooms: num(form.minRooms),
            max_rooms: num(form.maxRooms),
            min_size: num(form.minSize),
            min_floor: num(form.minFloor),
            max_floor: num(form.maxFloor),
            needs_mamad: form.needsMamad,
            needs_elevator: form.needsElevator,
            needs_parking: form.needsParking,
            needs_balcony: form.needsBalcony,
          },
        },
      }).catch(() => {});
    } catch {
      /* קליטת ליד היא Best-effort */
    }
    trackEvent("lead_submit", siteId);
    setSent(true);
    openWa(
      t.buyers.waMsg(live.name, {
        name: form.name,
        phone: form.phone,
        budget: budgetText,
        rooms: roomsText,
        area: areaText,
      }),
      live.phoneTel,
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
        href={agentGroup || business.whatsappGroup.url1}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-4 text-lg font-bold text-whatsapp-foreground shadow-lift sm:w-auto"
      >
        <Users className="size-6" aria-hidden="true" />
        {t.buyers.joinGroup}
      </a>
      {/* "הקבוצה מלאה" רלוונטי רק לקבוצות המשרד — לסוכן יש קבוצה אחת משלו */}
      {!agentGroup && (
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
      )}

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
              {t.buyers.dealType}
            </span>
            <select
              className="field"
              value={form.dealType}
              onChange={(e) =>
                setForm({ ...form, dealType: e.target.value === "השכרה" ? "השכרה" : "קנייה" })
              }
            >
              <option value="קנייה">{t.buyers.dealBuy}</option>
              <option value="השכרה">{t.buyers.dealRent}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.propertyType}
            </span>
            <select
              className="field"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
            >
              <option value="">{t.buyers.choose}</option>
              {PROPERTY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.maps.propertyTypes[c] ?? c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.budgetMax}
            </span>
            <input
              className="field"
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={0}
              value={form.maxPrice}
              onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.buyers.roomsMin}
              </span>
              <select
                className="field"
                value={form.minRooms}
                onChange={(e) => setForm({ ...form, minRooms: e.target.value })}
              >
                <option value="">{t.buyers.choose}</option>
                {ROOM_STEPS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t.buyers.roomsMax}
              </span>
              <select
                className="field"
                value={form.maxRooms}
                onChange={(e) => setForm({ ...form, maxRooms: e.target.value })}
              >
                <option value="">{t.buyers.choose}</option>
                {ROOM_STEPS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t.buyers.neighborhoodsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {neighborhoods.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleHood(n)}
                  aria-pressed={form.hoods.includes(n)}
                  className={
                    form.hoods.includes(n)
                      ? "rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground"
                      : "rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {t.maps.neighborhoods[n] ?? n}
                </button>
              ))}
            </div>
          </div>
          <details className="sm:col-span-2">
            <summary className="cursor-pointer text-sm font-bold text-primary">
              {t.buyers.morePrefs}
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.buyers.minSize}
                </span>
                <input
                  className="field"
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  min={0}
                  value={form.minSize}
                  onChange={(e) => setForm({ ...form, minSize: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.buyers.floorMin}
                </span>
                <input
                  className="field"
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  min={0}
                  value={form.minFloor}
                  onChange={(e) => setForm({ ...form, minFloor: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t.buyers.floorMax}
                </span>
                <input
                  className="field"
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  min={0}
                  value={form.maxFloor}
                  onChange={(e) => setForm({ ...form, maxFloor: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.needsMamad}
                  onChange={(e) => setForm({ ...form, needsMamad: e.target.checked })}
                />
                {t.properties.features.mamad}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.needsElevator}
                  onChange={(e) => setForm({ ...form, needsElevator: e.target.checked })}
                />
                {t.properties.features.elevator}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.needsParking}
                  onChange={(e) => setForm({ ...form, needsParking: e.target.checked })}
                />
                {t.properties.features.parking}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.needsBalcony}
                  onChange={(e) => setForm({ ...form, needsBalcony: e.target.checked })}
                />
                {t.properties.features.balcony}
              </label>
            </div>
          </details>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          {t.misc.consentMarketing}
        </label>
        {err && (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            {err}
          </p>
        )}
        {sent && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-primary">
            {t.buyers.alertNote}
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
