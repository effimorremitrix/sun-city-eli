/**
 * מרענן את src/lib/netanya-streets.ts ממאגר "רחובות בישראל" של data.gov.il.
 *
 * הרצה:  bun run scripts/refresh-netanya-streets.ts
 *
 * הרשימה מוטמעת בקוד בכוונה (ולא נשלפת בזמן ריצה) כדי שחיפוש הרחובות לא
 * יהיה תלוי בזמינות של שירות חיצוני. הסקריפט הזה הוא הדרך לעדכן אותה
 * כשמשרד הפנים מוסיף רחובות.
 */
import { writeFileSync } from "node:fs";

const RESOURCE_ID = "9ad3862c-8391-4b2f-84a4-2d4c68625f4b";
/** סמל היישוב של נתניה במאגר משרד הפנים */
const NETANYA_CITY_CODE = 7400;
const OUT = new URL("../src/lib/netanya-streets.ts", import.meta.url);

type Record_ = { שם_רחוב?: string };

async function fetchAll(): Promise<string[]> {
  const names = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const params = new URLSearchParams({
      resource_id: RESOURCE_ID,
      limit: "1000",
      offset: String(offset),
      filters: JSON.stringify({ סמל_ישוב: NETANYA_CITY_CODE }),
    });
    const res = await fetch(`https://data.gov.il/api/3/action/datastore_search?${params}`);
    if (!res.ok) throw new Error(`data.gov.il החזיר ${res.status}`);
    const json = (await res.json()) as { result?: { records?: Record_[] } };
    const records = json.result?.records ?? [];
    for (const r of records) {
      const name = (r["שם_רחוב"] ?? "").trim();
      // "נתניה" מופיע כרשומה של היישוב עצמו ואינו רחוב
      if (name && name !== "נתניה") names.add(name);
    }
    if (records.length < 1000) break;
  }
  return [...names].sort((a, b) => a.localeCompare(b, "he"));
}

const streets = await fetchAll();
if (streets.length < 500) throw new Error(`נמשכו ${streets.length} רחובות בלבד — חשוד, לא כותבים`);

const header = `/**
 * ============================================================
 * רשימת הרחובות הרשמית של נתניה — ${streets.length} רחובות, שכונות ואזורים.
 *
 * המקור: מאגר "רחובות בישראל" של data.gov.il (משרד הפנים), סמל יישוב
 * ${NETANYA_CITY_CODE} = נתניה. הרשימה מוטמעת בקוד ולא נשלפת בזמן ריצה, כדי שהחיפוש
 * לא יהיה תלוי בזמינות של שירות חיצוני.
 *
 * למה זה קיים: רשימת הרחובות בחיפוש נגזרה קודם מכתובות הנכסים —
 * של SUN CITY ואחר כך גם של המודעות שנסרקו. גם אחרי ההרחבה היא כיסתה
 * 216 רחובות בלבד, כלומר לקוח שחיפש רחוב שלא נסרק לא מצא אותו. עכשיו
 * כל רחוב בנתניה ניתן לבחירה, בלי קשר למלאי או לסריקה.
 *
 * עדכון: scripts/refresh-netanya-streets.ts מושך מחדש מ-data.gov.il.
 * ============================================================
 */

export const NETANYA_STREETS: readonly string[] = [
`;
const body = streets.map((s) => `  ${JSON.stringify(s)},\n`).join("");
writeFileSync(OUT, `${header}${body}];\n`, "utf8");
console.log(`נכתבו ${streets.length} רחובות אל ${OUT.pathname}`);
