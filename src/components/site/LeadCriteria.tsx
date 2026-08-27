import type { LeadCriteria } from "@/lib/leads.server";

/**
 * תקציר "מה הלקוח מחפש" מהקריטריונים המובנים של הליד — רשימת תגיות קצרות
 * לכרטיס הליד ולמגירה. מחזיר [] כשאין אף קריטריון (ליד ישן / טופס חופשי).
 */
export function leadCriteriaChips(lead: Partial<LeadCriteria>): string[] {
  const chips: string[] = [];
  const fmt = (n: number) => n.toLocaleString("he-IL");

  if (lead.deal_type) chips.push(lead.deal_type);
  if (lead.property_type) chips.push(lead.property_type);
  if (lead.city && lead.city !== "נתניה") chips.push(lead.city);
  for (const hood of lead.neighborhoods ?? []) chips.push(hood);
  if (lead.min_price != null && lead.max_price != null)
    chips.push(`תקציב ${fmt(lead.min_price)}–${fmt(lead.max_price)} ₪`);
  else if (lead.max_price != null) chips.push(`תקציב עד ${fmt(lead.max_price)} ₪`);
  else if (lead.min_price != null) chips.push(`תקציב מ-${fmt(lead.min_price)} ₪`);
  if (lead.min_rooms != null && lead.max_rooms != null)
    chips.push(`${lead.min_rooms}–${lead.max_rooms} חדרים`);
  else if (lead.min_rooms != null) chips.push(`${lead.min_rooms}+ חדרים`);
  else if (lead.max_rooms != null) chips.push(`עד ${lead.max_rooms} חדרים`);
  if (lead.min_size != null) chips.push(`${fmt(lead.min_size)}+ מ"ר`);
  if (lead.min_floor != null || lead.max_floor != null)
    chips.push(`קומה ${lead.min_floor ?? "?"}–${lead.max_floor ?? "?"}`);
  if (lead.needs_mamad) chips.push('ממ"ד');
  if (lead.needs_elevator) chips.push("מעלית");
  if (lead.needs_parking) chips.push("חניה");
  if (lead.needs_balcony) chips.push("מרפסת");
  return chips;
}

/** כרטיס "מה הלקוח מחפש" — מוצג במגירת הליד כשקיימים קריטריונים מובנים */
export function LeadCriteriaCard({ lead }: { lead: Partial<LeadCriteria> }) {
  const chips = leadCriteriaChips(lead);
  if (!chips.length) return null;
  return (
    <div className="rounded-xl border-2 border-sun/50 bg-secondary/50 p-3">
      <p className="text-sm font-extrabold text-primary">מה הלקוח מחפש</p>
      <p className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full bg-card px-2.5 py-1 text-xs font-bold text-primary shadow-soft"
          >
            {c}
          </span>
        ))}
      </p>
    </div>
  );
}
