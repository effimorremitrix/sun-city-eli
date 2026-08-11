import { Baby, Flame, ShoppingBag, Users } from "lucide-react";

const items = [
  { icon: Flame, title: "חמים וביתי", text: "בישול איטי, מתכונים של הבית" },
  { icon: Baby, title: "מתאים לילדים", text: "אווירה שכונתית ונינוחה" },
  { icon: Users, title: "מארחים קבוצות", text: "שולחנות גדולים ואירועים" },
  { icon: ShoppingBag, title: "איסוף עצמי", text: "אורזים חם ומוכן ליציאה" },
];

export function TrustStrip() {
  return (
    <section className="border-y border-border bg-secondary/50 py-6">
      <ul className="no-scrollbar mx-auto flex max-w-6xl snap-x gap-3 overflow-x-auto px-4 md:grid md:grid-cols-4 md:overflow-visible">
        {items.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="linen-card min-w-[13rem] shrink-0 snap-start p-4 md:min-w-0"
          >
            <Icon className="size-6 text-gold" />
            <h3 className="mt-3 text-base">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
