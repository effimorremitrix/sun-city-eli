/**
 * ============================================================
 * סוג הנכס ושדות רלוונטיים לתצוגה.
 *
 * הבעיה שזה פותר: הכרטיס והחלון הציגו תמיד את אותם שדות, וכשלא היה ערך
 * הוצג "אין מידע" — גם כששדה כלל אינו רלוונטי (חדרים או קומה במגרש),
 * וגם בנכס חיצוני שבו הנתון פשוט חסר. לקוח ראה "קומה – אין מידע" במקום
 * לא לראות את השורה בכלל.
 *
 * המדיניות: שדה מוצג רק אם הוא *רלוונטי לסוג הנכס* וגם *יש לו ערך*.
 * אין לטבלה שדה "סוג נכס" במסד, ולכן הסוג נגזר מהכותרת — שנכתבת ממילא
 * בעברית לפי סוג הנכס ("מגרש לבנייה בקריית השרון", "פנטהאוז 5 חדרים").
 * ברירת המחדל כשלא זוהה סוג: דירה, כלומר כל השדות רלוונטיים — כך שגזירה
 * שגויה לעולם אינה מסתירה מידע שקיים.
 * ============================================================
 */

export const PROPERTY_TYPES = [
  "apartment",
  "penthouse",
  "gardenApartment",
  "duplex",
  "house",
  "plot",
  "commercial",
  "storageUnit",
  "building",
] as const;

export type PropertyTypeKey = (typeof PROPERTY_TYPES)[number];

/** שדות התצוגה שאפשר להסתיר לפי סוג הנכס */
export type PropertyField =
  "rooms" | "floor" | "size" | "mamad" | "elevator" | "parking" | "balcony" | "storage";

const ALL_FIELDS: PropertyField[] = [
  "rooms",
  "floor",
  "size",
  "mamad",
  "elevator",
  "parking",
  "balcony",
  "storage",
];

/** מילות זיהוי בכותרת/בתיאור — הבדיקה לפי הסדר הזה, הספציפי קודם */
const TYPE_PATTERNS: Array<[PropertyTypeKey, RegExp]> = [
  ["plot", /מגרש|מגרשים|קרקע חקלאית|קרקע לבנייה|נחלה|משק/],
  ["storageUnit", /^מחסן|\bמחסן להשכרה|חניה להשכרה|חנייה להשכרה/],
  ["commercial", /חנות|משרד|משרדים|מסחרי|קליניקה|מבנה תעשייה|אולם|לוגיסטי/],
  ["building", /בניין שלם|מבנה שלם|בניין למכירה|קומבינציה|פינוי בינוי|תמ"א/],
  ["gardenApartment", /דירת גן|גארדן/],
  ["penthouse", /פנטהאוז|פנטהאוס|מיני פנטהאוז/],
  ["duplex", /דופלקס|טריפלקס/],
  ["house", /בית פרטי|וילה|קוטג|דו משפחתי|דו-משפחתי|טאון האוס/],
  ["apartment", /דירה|יחידת דיור|סטודיו|לופט/],
];

/** השדות הרלוונטיים לכל סוג — סוג שאינו ברשימה מקבל את כל השדות */
const RELEVANT: Partial<Record<PropertyTypeKey, PropertyField[]>> = {
  // במגרש אין חדרים, קומה, מעלית, ממ"ד, מרפסת או מחסן — רק שטח
  plot: ["size"],
  building: ["size", "floor", "parking", "elevator"],
  commercial: ["size", "floor", "parking", "elevator", "rooms"],
  storageUnit: ["size", "floor", "parking"],
  // בבית פרטי אין קומה בבניין ואין מעלית
  house: ["rooms", "size", "mamad", "parking", "balcony", "storage"],
};

/** סוג הנכס לפי הכותרת (ובמידת הצורך גם התיאור). ברירת מחדל: דירה. */
export function detectPropertyType(
  title: string | null | undefined,
  description?: string | null,
): PropertyTypeKey {
  const text = `${title ?? ""} ${description ?? ""}`;
  for (const [key, re] of TYPE_PATTERNS) {
    if (re.test(text)) return key;
  }
  return "apartment";
}

/** האם השדה רלוונטי לסוג הנכס הזה */
export function isFieldRelevant(type: PropertyTypeKey, field: PropertyField): boolean {
  return (RELEVANT[type] ?? ALL_FIELDS).includes(field);
}

/** השדות הרלוונטיים לסוג, בסדר התצוגה */
export function relevantFields(type: PropertyTypeKey): PropertyField[] {
  const allowed = RELEVANT[type] ?? ALL_FIELDS;
  return ALL_FIELDS.filter((f) => allowed.includes(f));
}

/**
 * האם יש ערך להצגה. null/undefined/מחרוזת ריקה = אין, ולכן השדה לא מוצג
 * (במקום "אין מידע"). false על מתקן נחשב ערך: "אין מעלית" הוא מידע.
 */
export const hasValue = (v: unknown): boolean =>
  v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");
