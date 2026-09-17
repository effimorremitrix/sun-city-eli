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
import { mergeStreets, normalizeStreet } from "../src/lib/streets";
import { NETANYA_STREETS } from "../src/lib/netanya-streets";
import { localizeMarketTitle } from "../src/lib/market";
import { needsTranslation } from "../src/lib/translate-backfill.server";
import { localizeListing, type Listing } from "../src/lib/listings";
import { personalAreaLink, personalAreaRole } from "../src/lib/personal-area";
import { localizeLive, type LiveSite } from "../src/lib/site-live";
import { agentNameFor, type PublicAgentRow } from "../src/lib/agents.server";
import { DICTS } from "../src/lib/i18n";

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
const merged = mergeStreets(["הרצל 12"], ["הרצל"], NETANYA_STREETS);
check("אותו רחוב לא מופיע פעמיים", merged.filter((s) => s === "הרצל").length, 1);
check("הרשימה הרשמית נטענה במלואה", merged.length > 1000, true);
check("רחוב מרכזי קיים", merged.includes("שמואל הנציב"), true);
// רחובות שאין בהם נכס של SUN CITY ולא נסרקה בהם מודעה — הלב של סעיף 4
check("רחוב ללא מלאי שלנו — קיים", merged.includes("אדית פיאף"), true);
check("רחוב ללא מלאי שלנו — קיים (2)", merged.includes("רות ביידר גינסבורג"), true);
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

console.log("\n--- שם הסוכן בשפת הדף ---");
const baseListing = {
  id: "l1",
  title: "דירת 4 חדרים",
  description: null,
  translations: { en: { title: "4-room apartment" } },
  agent: {
    slug: "eli-kalif",
    name: "אלי כליף",
    phone: null,
    phoneTel: null,
    photoUrl: null,
    nameByLang: { en: "Eli Kalif", fr: "Eli Kalif", ru: "Эли Калиф" },
  },
} as unknown as Listing;
check("בעברית השם נשאר כמות שהוא", localizeListing(baseListing, "he").agent?.name, "אלי כליף");
check("אנגלית — תעתיק", localizeListing(baseListing, "en").agent?.name, "Eli Kalif");
check("צרפתית — תעתיק", localizeListing(baseListing, "fr").agent?.name, "Eli Kalif");
check("רוסית — תעתיק", localizeListing(baseListing, "ru").agent?.name, "Эли Калиф");
check("כותרת מתורגמת נשמרת", localizeListing(baseListing, "en").title, "4-room apartment");
// נכס בלי תרגום טקסט — שם הסוכן עדיין חייב להיות בשפת הדף
const noText = { ...baseListing, translations: null } as unknown as Listing;
check(
  "נכס בלי תרגום טקסט — השם עדיין מתועתק",
  localizeListing(noText, "en").agent?.name,
  "Eli Kalif",
);
check(
  "אין תעתיק לשפה — נשארת העברית",
  localizeListing(
    { ...baseListing, agent: { ...baseListing.agent!, nameByLang: {} } } as unknown as Listing,
    "en",
  ).agent?.name,
  "אלי כליף",
);

// אותו תעתיק חייב לעבוד גם בהדר, בפרופיל הסוכן ובכרטיסי הצוות
const liveSite = {
  business: {
    agentName: "אלי כליף",
    roleTitle: "שותף ובעלים",
    bio: "",
    name: "Sun City",
    tagline: "",
    subtitle: "",
    address: "",
    hours: [],
  },
  texts: {},
  items: [],
  testimonials: null,
  faq: null,
  translations: {
    en: { business: { agentName: "Eli Kalif", roleTitle: "Partner and Owner" } },
    ru: { business: { agentName: "Эли Калиф" } },
  },
} as unknown as LiveSite;
check(
  "הדר/פרופיל — אנגלית",
  localizeLive(liveSite, "en", DICTS.en).business.agentName,
  "Eli Kalif",
);
check("הדר/פרופיל — רוסית", localizeLive(liveSite, "ru", DICTS.ru).business.agentName, "Эли Калиф");
check(
  "אין תעתיק לצרפתית — נשארת העברית",
  localizeLive(liveSite, "fr", DICTS.fr).business.agentName,
  "אלי כליף",
);
const agentRow = {
  slug: "eli-kalif",
  name: "סאן סיטי",
  agent_name: "אלי כליף",
  translations: { en: { business: { agentName: "Eli Kalif" } } },
} as unknown as PublicAgentRow;
check("כרטיס צוות — אנגלית", agentNameFor(agentRow, "en"), "Eli Kalif");
check("כרטיס צוות — עברית", agentNameFor(agentRow, "he"), "אלי כליף");

console.log("\n--- אחרי התחברות: לאן מוביל 'האזור האישי שלי' ---");
check("לקוח", personalAreaRole({ isAdmin: false, isAgent: false }), "client");
check("סוכן", personalAreaRole({ isAdmin: false, isAgent: true }), "agent");
check("מנהל", personalAreaRole({ isAdmin: true, isAgent: false }), "admin");
check("מנהל שהוא גם סוכן -> מנהל", personalAreaRole({ isAdmin: true, isAgent: true }), "admin");
check("לא מחובר -> לקוח", personalAreaRole(null), "client");
check("לקוח נכנס לפורטל", personalAreaLink({ isAgent: false }), { to: "/account", search: {} });
check("סוכן נכנס ללידים שלו", personalAreaLink({ isAgent: true }), {
  to: "/account",
  search: { tab: "leads" },
});
check("מנהל נכנס ללוח הניהול", personalAreaLink({ isAdmin: true }), {
  to: "/account",
  search: { tab: "leads" },
});

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
