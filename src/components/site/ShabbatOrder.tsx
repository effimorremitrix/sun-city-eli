import { useState } from "react";
import { MessageCircle, Clock, Package } from "lucide-react";
import { business, whatsappLink } from "@/lib/business";

const dishes = [
  "צ'ולנט",
  "קוגל תפוחי אדמה",
  "קישקע",
  "מרק עוף עם קניידלך",
  "גפילטע פיש",
  "חמין ירושלמי",
];

export function ShabbatOrder() {
  const [name, setName] = useState("");
  const [people, setPeople] = useState("4");
  const [pickup, setPickup] = useState("שישי אחה\"צ");
  const [selected, setSelected] = useState<string[]>(["צ'ולנט"]);
  const [notes, setNotes] = useState("");

  const toggle = (dish: string) =>
    setSelected((prev) =>
      prev.includes(dish) ? prev.filter((d) => d !== dish) : [...prev, dish],
    );

  const message = [
    `שלום ${business.name}! אני רוצה להזמין לשבת:`,
    `שם: ${name || "[שם]"}`,
    `מספר סועדים: ${people}`,
    `זמן איסוף: ${pickup}`,
    `מנות: ${selected.length ? selected.join(", ") : "[לבחירה]"}`,
    notes ? `הערות: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section id="shabbat" className="mx-auto max-w-3xl px-4 py-14 md:py-20">
      <p className="text-sm font-bold tracking-wide text-gold">ההזמנה שלכם</p>
      <h2 className="mt-2 text-3xl md:text-4xl">הזמנת שבת</h2>
      <p className="mt-3 text-base leading-relaxed text-foreground/85">
        ממלאים, שולחים בוואטסאפ, ואוספים חם. מזמינים עד יום חמישי בערב כדי
        שנשמור לכם מהסיר.
      </p>

      <div className="linen-card mt-6 space-y-5 p-5">
        <div>
          <label htmlFor="name" className="text-sm font-bold">
            שם מלא
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="איך לרשום את ההזמנה?"
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-gold"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="people" className="text-sm font-bold">
              מספר סועדים
            </label>
            <input
              id="people"
              type="number"
              min={1}
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-gold"
            />
          </div>
          <div>
            <label htmlFor="pickup" className="text-sm font-bold">
              זמן איסוף
            </label>
            <select
              id="pickup"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-gold"
            >
              <option>שישי בבוקר</option>
              <option>שישי אחה"צ</option>
              <option>שבת בצהריים</option>
            </select>
          </div>
        </div>

        <div>
          <span className="text-sm font-bold">מה לארוז?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {dishes.map((dish) => (
              <button
                key={dish}
                type="button"
                onClick={() => toggle(dish)}
                aria-pressed={selected.includes(dish)}
                className={
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                  (selected.includes(dish)
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground/80")
                }
              >
                {dish}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-bold">
            הערות
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="בלי חריף, תוספת ביצים, אלרגיות..."
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-gold"
          />
        </div>

        <a
          href={whatsappLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-4 text-base font-bold text-whatsapp-foreground shadow-lift"
        >
          <MessageCircle className="size-5" />
          שליחת ההזמנה בוואטסאפ
        </a>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-gold" /> הזמנות עד יום חמישי בערב
          </span>
          <span className="flex items-center gap-2">
            <Package className="size-4 text-gold" /> איסוף עצמי מ{business.address}
          </span>
        </div>
      </div>
    </section>
  );
}
