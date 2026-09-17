/**
 * בדיקות QA ללוגיקה הטהורה של סבב התיקונים.
 *
 * הרצה:  bun run scripts/qa-checks.ts     (או: npx tsx scripts/qa-checks.ts)
 *
 * למה סקריפט ולא מסגרת בדיקות: בפרויקט אין עדיין הרצת בדיקות, והבדיקות
 * כאן מכסות בדיוק את ההחלטות שקל לשבור בשינוי הבא — אילו שדות מוצגים לפי
 * סוג הנכס, אוצר הרחובות שאינו תלוי במלאי, בניית כותרת מודעה בשפת הדף,
 * בחירת יעד הוואטסאפ לפי מכשיר ובחירת הפריטים להשלמת תרגום.
 */
import { detectPropertyType, hasValue, isFieldRelevant } from "../src/lib/property-type";
import { mergeStreets, normalizeStreet, SEED_STREETS } from "../src/lib/streets";
import { localizeMarketTitle } from "../src/lib/market";
import { needsTranslation } from "../src/lib/translate-backfill.server";

let failures = 0;
const check = (label: string, got: unknown, expected: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `  (ציפינו ל-${JSON.stringify(expected)}, קיבלנו ${JSON.stringify(got)})`),
  );
};

console.log("--- סעיף 11: סוג נכס ושדות רלוונטיים ---");
check(
  "מגרש מזוהה מהכותרת",
  detectPropertyType("מגרש 642 מ' בשכונת ותיקים, ויתקין 1 נתניה"),
  "plot",
);
check("במגרש לא מציגים חדרים", isFieldRelevant("plot", "rooms"), false);
check("במגרש לא מציגים קומה", isFieldRelevant("plot", "floor"), false);
check("במגרש כן מציגים שטח", isFieldRelevant("plot", "size"), true);
check("דירה מזוהה", detectPropertyType('דירת 4 חדרים, 110 מ"ר, דיזנגוף 26 נתניה'), "apartment");
check("בדירה כן מציגים קומה", isFieldRelevant("apartment", "floor"), true);
check("דירת גן מזוהה", detectPropertyType('דירת גן 4 חדרים, 87 מ"ר'), "gardenApartment");
check("פנטהאוז מזוהה", detectPropertyType('פנטהאוס על מפלס אחד, 115 מ"ר'), "penthouse");
check("דו משפחתי נחשב בית פרטי", detectPropertyType('דו משפחתי, 5.5 חדרים, 171 מ"ר'), "house");
check("בבית פרטי אין מעלית", isFieldRelevant("house", "elevator"), false);
check("בבית פרטי אין קומה בבניין", isFieldRelevant("house", "floor"), false);
check(
  "סוג לא מזוהה נופל לדירה — לא מסתירים מידע קיים",
  isFieldRelevant(detectPropertyType("נכס מיוחד"), "floor"),
  true,
);
check("null אינו ערך להצגה", hasValue(null), false);
check("מחרוזת ריקה אינה ערך", hasValue("  "), false);
check("אפס הוא ערך", hasValue(0), true);
check("false הוא ערך (אין מעלית = מידע)", hasValue(false), true);

console.log("\n--- סעיף 6: אוצר רחובות שאינו תלוי במלאי SUN CITY ---");
check("מספר בית מוסר", normalizeStreet("הרצל 12"), "הרצל");
check("גרשיים מוסרים", normalizeStreet('שד״ בן אב"י 41'), "שד בן אבי");
const merged = mergeStreets(["הרצל 12"], ["הרצל"], SEED_STREETS);
check("אותו רחוב לא מופיע פעמיים", merged.filter((s) => s === "הרצל").length, 1);
check("רחוב מרשימת הזרע קיים", merged.includes("שמואל הנציב"), true);
check("רחוב שאין בו נכס שלנו ניתן לבחירה", merged.includes("דיזנגוף"), true);

console.log("\n--- סעיף 1: כותרת מודעה מהלוח בשפת הדף ---");
const dict = {
  maps: {
    propertyType: { apartment: "Apartment", plot: "Plot" },
    neighborhoods: { "מרכז העיר דרום": "City Center South" },
  },
  properties: { roomsUnit: "rooms" },
};
const ad = {
  title: "דירה 4 חדרים, הרצל 12, מרכז העיר דרום",
  description: null,
  rooms: 4,
  address: "הרצל 12",
  neighborhood: "מרכז העיר דרום",
};
check(
  "בעברית נשארת הכותרת המקורית",
  localizeMarketTitle(ad, dict, "he", detectPropertyType),
  ad.title,
);
check(
  "באנגלית הכותרת נבנית מהשדות המובנים",
  localizeMarketTitle(ad, dict, "en", detectPropertyType),
  "Apartment · 4 rooms, הרצל 12, City Center South",
);

console.log("\n--- סעיף 1: השלמת תרגומים — אילו פריטים נבחרים ---");
check("בלי תרגום כלל — נבחר", needsTranslation(null, ["title"]), true);
check(
  "רק אנגלית — נבחר (חסרות צרפתית ורוסית)",
  needsTranslation({ en: { title: "X" } }, ["title"]),
  true,
);
check(
  "שלוש השפות מלאות — לא נבחר",
  needsTranslation({ en: { title: "X" }, fr: { title: "Y" }, ru: { title: "Z" } }, ["title"]),
  false,
);
check(
  "שדה אחד חסר — נבחר",
  needsTranslation({ en: { title: "X" }, fr: { title: "Y" }, ru: { title: "Z" } }, [
    "title",
    "description",
  ]),
  true,
);
check(
  "תרגום ריק נחשב חסר",
  needsTranslation({ en: { title: "  " }, fr: { title: "Y" }, ru: { title: "Z" } }, ["title"]),
  true,
);

console.log("\n--- סעיפים 7 ו-9: יעד הוואטסאפ לפי מכשיר ---");
const globals = globalThis as { navigator?: { userAgent: string } };
const originalNavigator = globals.navigator;
const withUa = async (ua: string) => {
  Object.defineProperty(globals, "navigator", { value: { userAgent: ua }, configurable: true });
  // ייבוא טרי בכל פעם — isMobileDevice נבדק בזמן קריאה, לא בזמן טעינה
  const mod = await import("../src/lib/whatsapp-open");
  return mod;
};
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const wa = await withUa(IPHONE);
check("נייד מזוהה", wa.isMobileDevice(), true);
check(
  "בנייד נפתח wa.me (מעביר לאפליקציה)",
  wa.whatsappUrl("שלום", "052-5551200").startsWith("https://wa.me/972525551200?text="),
  true,
);
Object.defineProperty(globals, "navigator", { value: { userAgent: DESKTOP }, configurable: true });
check("מחשב אינו נייד", wa.isMobileDevice(), false);
check(
  "במחשב נפתח WhatsApp Web",
  wa
    .whatsappUrl("שלום", "052-5551200")
    .startsWith("https://web.whatsapp.com/send?phone=972525551200"),
  true,
);
check("קידומת ישראלית", wa.toIntl("0525551200"), "972525551200");
check("מספר שכבר בינלאומי לא מקבל קידומת כפולה", wa.toIntl("972525551200"), "972525551200");
check("+972 עם מקפים", wa.toIntl("+972-52-555-1200"), "972525551200");
check("מספר ריק", wa.toIntl(""), "");
if (originalNavigator) {
  Object.defineProperty(globals, "navigator", { value: originalNavigator, configurable: true });
}

console.log(failures === 0 ? "\n✓ כל הבדיקות עברו" : `\n✗ ${failures} בדיקות נכשלו`);
if (failures) process.exit(1);
