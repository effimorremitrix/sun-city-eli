/**
 * ============================================================
 * אוצר הרחובות של נתניה — מודול איזומורפי (שרת ולקוח).
 *
 * הבעיה שזה פתר: רשימת הרחובות בחיפוש נגזרה מכתובות הנכסים — תחילה של
 * SUN CITY בלבד, ואחר כך גם של המודעות שנסרקו. גם אחרי ההרחבה היא כיסתה
 * 216 רחובות בלבד מתוך 1048, כלומר לקוח שחיפש רחוב שלא נסרק לא מצא אותו.
 *
 * המודל עכשיו: מקור האמת הוא הרשימה הרשמית של משרד הפנים
 * (netanya-streets.ts, נשלפת מ-data.gov.il) — כל רחוב בנתניה ניתן לבחירה
 * בלי קשר למלאי או לסריקה. אליה מתמזגות כתובות מהמסד, כדי לתפוס גם כתיב
 * שונה וגם פרויקטים חדשים שטרם נכנסו למאגר הממשלתי.
 *
 * מעבר לזה, שדה הרחוב הוא *טקסט חופשי* ולעולם אינו מוגבל לרשימה: הרשימה
 * משמשת להשלמה אוטומטית ולזיהוי שם רחוב בשאילתה חופשית בלבד.
 * ============================================================
 */

/** נרמול להשוואה: בלי גרשיים, מספרי בית ורווחים כפולים */
export const normalizeStreet = (value: string): string =>
  value
    .replace(/["'׳״]/g, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * מיזוג רשימות רחובות עם דדופ לפי צורה מנורמלת, בשמירה על הכתיב הראשון
 * שנראה (מקור אמין קודם — נכסי המשרד לפני תוצאות סריקה).
 */
export function mergeStreets(...lists: Array<readonly string[] | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const street = normalizeStreet(String(raw ?? ""));
      if (street.length < 2) continue;
      const key = street.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(street);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "he"));
}
