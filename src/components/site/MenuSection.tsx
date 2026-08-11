import { useState } from "react";

/* ─── כל נתוני התפריט כאן. עדכון מחירים בלי לגעת בעיצוב ─── */
type MenuItem = {
  name: string;
  desc: string;
  price: string;
  recommended?: boolean;
};

type MenuCategory = { id: string; label: string; items: MenuItem[] };

const MENU: MenuCategory[] = [
  {
    id: "hot",
    label: "מנות חמות",
    items: [
      {
        name: "צ'ולנט",
        desc: "מתבשל לאט מליל חמישי, שעועית, גריסים ובשר",
        price: "[להשלמה]",
        recommended: true,
      },
      {
        name: "קוגל תפוחי אדמה",
        desc: "אפוי עד זהוב, פריך מחוץ ורך מבפנים",
        price: "[להשלמה]",
        recommended: true,
      },
      {
        name: "קישקע",
        desc: "מסורתי, מתבשל יחד עם הצ'ולנט",
        price: "[להשלמה]",
      },
      {
        name: "חמין ירושלמי",
        desc: "עשיר ומתקתק, כמו שאוהבים בשבת",
        price: "[להשלמה]",
      },
    ],
  },
  {
    id: "soups",
    label: "מרקים",
    items: [
      {
        name: "מרק עוף עם קניידלך",
        desc: "צלול, ביתי, עם ירקות שורש וקניידלך רכים",
        price: "[להשלמה]",
        recommended: true,
      },
      {
        name: "מרק שעועית",
        desc: "סמיך ומחמם, מתאים לערב קר",
        price: "[להשלמה]",
      },
    ],
  },
  {
    id: "sides",
    label: "תוספות",
    items: [
      {
        name: "גפילטע פיש",
        desc: "מוגש קר עם חזרת ומרק צח",
        price: "[להשלמה]",
      },
      { name: "סלט חצילים", desc: "קלוי על אש עם מיונז ביתי", price: "[להשלמה]" },
      { name: "ביצה חומה", desc: "מהסיר, כמו של פעם", price: "[להשלמה]" },
    ],
  },
  {
    id: "desserts",
    label: "קינוחים",
    items: [
      { name: "עוגת שמרים", desc: "אפויה במקום, ריבה או שוקולד", price: "[להשלמה]" },
      { name: "קומפוט פירות", desc: "מתקתק וקר, לסיום הארוחה", price: "[להשלמה]" },
    ],
  },
  {
    id: "trays",
    label: "מגשי אירוח",
    items: [
      {
        name: "מגש צ'ולנט לקבוצה",
        desc: "מתאים ל‑8–10 סועדים, כולל תוספות",
        price: "[להשלמה]",
        recommended: true,
      },
      {
        name: "מגש שבת משפחתי",
        desc: "צ'ולנט, קוגל, קישקע ומרק",
        price: "[להשלמה]",
      },
    ],
  },
];

export function MenuSection() {
  const [active, setActive] = useState(MENU[0].id);
  const category = MENU.find((c) => c.id === active) ?? MENU[0];

  return (
    <section id="menu" className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-sm font-bold tracking-wide text-gold">התפריט</p>
        <h2 className="mt-2 text-3xl md:text-4xl">מה יש לנו בסיר</h2>

        <div className="sticky top-16 z-30 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {MENU.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                aria-pressed={active === c.id}
                className={
                  "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors " +
                  (active === c.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground/80")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {category.items.map((item) => (
            <li key={item.name} className="linen-card flex gap-4 p-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base">{item.name}</h3>
                  {item.recommended && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-primary">
                      מומלץ
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <div className="shrink-0 self-center text-sm font-bold text-primary">
                {item.price}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
