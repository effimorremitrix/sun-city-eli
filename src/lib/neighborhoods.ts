/**
 * ============================================================
 * שכונות נתניה — מקור אמת יחיד, מיושר לחלוקת השכונות של יד2.
 *
 * השם העברי (`he`) הוא הערך הקנוני שנשמר במסד (listings.neighborhood,
 * search_profiles.neighborhoods וכו') ומשמש כמפתח בתרגומי
 * `t.maps.neighborhoods`. הכתיב "קריית" (יו"ד כפולה) נשמר כמו בשאר האתר —
 * ההשוואה מול יד2 ("קרית") עוברת דרך normalizeHebrew.
 *
 * `yad2HoodId` — מזהה השכונה בכתובות של יד2 (city=7400). null = טרם אומת;
 * שכונה בלי מזהה עדיין נפתרת בזמן ריצה דרך ה-autocomplete של יד2.
 * ============================================================
 */

export type Neighborhood = {
  /** השם הקנוני בעברית — הערך שנשמר במסד */
  he: string;
  /** מזהה השכונה ביד2 (פרמטר neighborhood= בכתובת), null כשלא אומת */
  yad2HoodId: string | null;
};

export const NEIGHBORHOODS: Neighborhood[] = [
  { he: "אגמים", yad2HoodId: "855" },
  { he: "אום חאלד", yad2HoodId: null },
  { he: "אופק הים", yad2HoodId: null },
  { he: "גבעת האירוסים", yad2HoodId: "163" },
  { he: "גן ברכה", yad2HoodId: null },
  { he: "טוברוק", yad2HoodId: null },
  { he: "כוכב הצפון", yad2HoodId: "1693" },
  { he: "מחנה יעקב", yad2HoodId: null },
  { he: "מרכז העיר דרום", yad2HoodId: "1696" },
  { he: "משכנות זבולון", yad2HoodId: null },
  { he: "נאות בגין", yad2HoodId: null },
  { he: "נאות גנים", yad2HoodId: "339" },
  { he: "נאות הרצל", yad2HoodId: "336" },
  { he: "נאות שקד", yad2HoodId: "159" },
  { he: "נווה איתמר", yad2HoodId: null },
  { he: "נווה עוז", yad2HoodId: null },
  { he: "נוף הטיילת", yad2HoodId: "660" },
  { he: "נוף השרון", yad2HoodId: "1699" },
  { he: "עין התכלת", yad2HoodId: "333" },
  { he: "עיר ימים", yad2HoodId: "343" },
  { he: "פארק הים", yad2HoodId: null },
  { he: "פרדס הגדוד", yad2HoodId: "335" },
  { he: "צפון מזרח מרכז העיר", yad2HoodId: "1694" },
  { he: "צפון מערב מרכז העיר", yad2HoodId: "1695" },
  { he: "קריית אליעזר", yad2HoodId: null },
  { he: "קריית המדע", yad2HoodId: "991573" },
  { he: "קריית השרון", yad2HoodId: "341" },
  { he: "קריית נורדאו", yad2HoodId: "164" },
  { he: "קריית צאנז", yad2HoodId: "334" },
  { he: "קריית רבין", yad2HoodId: null },
  { he: "רמת אפרים", yad2HoodId: "160" },
  { he: "רמת חן ובן ציון", yad2HoodId: "854" },
  { he: "רמת ידין", yad2HoodId: "162" },
  { he: "רמת פולג", yad2HoodId: "342" },
];

/** רשימת השמות הקנוניים — הצורה שרוב הצרכנים (טפסים, פילטרים, AI) עובדים איתה */
export const neighborhoods = NEIGHBORHOODS.map((n) => n.he);

/**
 * ערכים ישנים שהוחלפו ביישור ליד2 — לשימוש בקוד תצוגה שנתקל בערך היסטורי
 * (המיגרציה מעדכנת את המסד, אבל ערך ישן יכול עוד להגיע מטופס פתוח וכו').
 */
export const LEGACY_NEIGHBORHOOD_RENAMES: Record<string, string> = {
  "רמת חן": "רמת חן ובן ציון",
  "פארק ים": "פארק הים",
  "מרכז העיר": "מרכז העיר דרום",
  "צפון העיר": "כוכב הצפון",
};

/** ממפה ערך שכונה (כולל ערכים ישנים) לשם הקנוני הנוכחי */
export const canonicalNeighborhood = (value: string): string =>
  LEGACY_NEIGHBORHOOD_RENAMES[value] ?? value;
