import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";

/* ============================================================
 * SITE_CONFIG — כל המספרים, המיילים והקישורים במקום אחד.
 * ============================================================ */

export const SITE_CONFIG = {
  name: 'סאן סיטי נדל"ן',
  nameEn: "Sun City",
  tagline: "מחברים בין אנשים לנכסים",
  subtitle: "מכירה | קנייה | השכרת נכסים",
  address: "רחוב שמואל הנציב 20, נתניה, קומת קרקע (ליד בנק מרכנתיל)",
  addressShort: "שמואל הנציב 20, נתניה",
  phone: "073-2113213",
  phoneTel: "0732113213",
  whatsappDisplay: "052-5556288",
  whatsappIntl: "972525556288",
  email: "sun.city.netanya@gmail.com",
  areaServed: "נתניה והסביבה",
  hours: [
    { day: "ראשון – חמישי", value: "[להשלמה]" },
    { day: "שישי", value: "[להשלמה]" },
    { day: "שבת", value: "סגור" },
  ],
  whatsappGroup: {
    name: 'זה הזמן לקנות נדל"ן',
    members: 945,
    url: "[להשלמה]", // קישור קבוצת הוואטסאפ
  },
  madlanUrl:
    "https://www.madlan.co.il/agentsOffice/re_office_cFjv57RxrAL?source=madad_index",
  social: {
    facebook: "https://www.facebook.com/sun.city.netanya",
    instagram: "https://www.instagram.com/sun_city_netanya/",
  },
  badge: "בין 10 סוכנויות הנדל\"ן המובילות בנתניה, בדירוג אתר מדל\"ן",
  wazeUrl: "https://waze.com/ul?q=" + encodeURIComponent("שמואל הנציב 20, נתניה"),
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("שמואל הנציב 20, נתניה"),
};

/** שם נוח לשימוש בקומפוננטות */
export const business = SITE_CONFIG;

export const mapsEmbedUrl =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("שמואל הנציב 20, נתניה") +
  "&output=embed";

export const whatsappLink = (text: string) =>
  `https://wa.me/${SITE_CONFIG.whatsappIntl}?text=${encodeURIComponent(text)}`;

export const agentWhatsappLink = (phone: string, text: string) => {
  const digits = phone.replace(/[^\d]/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  if (!/^9725\d{8}$/.test(intl)) return whatsappLink(text);
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
};

/* ---------------------------- טקסטים ---------------------------- */

export const about =
  'סאן סיטי היא סוכנות הנדל"ן המובילה בנתניה, המתמחה במתן שירותים מקיפים בתחום הנדל"ן. אנו מספקים ללקוחותינו ליווי מקצועי ואישי לכל אורך תהליך רכישת או מכירת הנכס. עם ניסיון עשיר בשוק המקומי ומחויבות למצוינות, אנו כאן כדי לעזור לכם להפוך את חלום הנדל"ן שלכם למציאות.';

export const story =
  'סאן סיטי נדל"ן הוקמה מתוך תשוקה לשוק הנדל"ן ומחויבות לשירות איכותי ללקוחותינו. מאז הקמתנו, עזרנו למאות לקוחות למצוא את הנכס המושלם, למכור את דירתם בצורה המהירה והמשתלמת ביותר, ולהשקיע בנדל"ן בצורה חכמה ומושכלת.';

export const values = [
  { title: "מקצועיות", text: "שירות מקצועי ברמה הגבוהה ביותר." },
  { title: "שקיפות", text: "שיתוף מלא של כל המידע הרלוונטי עם הלקוחות." },
  { title: "אמינות", text: "יושרה ואחריות בכל פעולה." },
];

export const services = [
  {
    title: 'ייעוץ נדל"ן מקצועי',
    text: "ליווי אישי בכל שלב בתהליך הרכישה או המכירה, מהערכת שווי נכס ועד סגירת עסקה מוצלחת.",
  },
  {
    title: "הערכת שווי נכסים",
    text: "הערכה מדויקת על בסיס נתוני שוק עדכניים ומידע מפורט על הסביבה.",
  },
  {
    title: "תיווך וניהול עסקאות",
    text: 'איתור קונים או מוכרים, ניהול מו"מ וליווי עד הסגירה.',
  },
  {
    title: "ייעוץ משפטי",
    text: 'בשיתוף עו"ד מומחה לנדל"ן, לביטחון משפטי מלא בעסקה.',
  },
];

/* ---------------------------- צוות ---------------------------- */

export type Agent = {
  name: string;
  role: string;
  phone: string;
  email: string;
};

export const team: Agent[] = [
  {
    name: "ענבל קובל בוזגלו",
    role: "סוכנת ושותפה",
    phone: "052-5556288",
    email: "inbalkoval@suncity.org.il",
  },
  { name: "אלי כליף", role: "סוכן ושותף", phone: "[להשלמה]", email: "[להשלמה]" },
  {
    name: "קובי בוזגלו",
    role: 'יועץ נדל"ן ומשכנתאות',
    phone: "[להשלמה]",
    email: "[להשלמה]",
  },
  { name: "ילנה גנדלין", role: 'סוכנת נדל"ן', phone: "[להשלמה]", email: "[להשלמה]" },
  { name: "אלעד אבוטבול", role: 'סוכן נדל"ן', phone: "[להשלמה]", email: "[להשלמה]" },
];

/* ---------------------------- נכסים ---------------------------- */

export type Property = {
  id: string;
  title: string;
  deal: "מכירה" | "השכרה";
  price: number;
  neighborhood: string;
  address: string;
  rooms: number;
  size: number;
  floor: string;
  tag?: "חדש" | "בלעדי";
  features: { mamad: boolean; elevator: boolean; parking: boolean; balcony: boolean };
  description: string;
  images: string[];
};

export const properties: Property[] = [
  {
    id: "p1",
    title: "דירת 4 חדרים מרווחת עם מרפסת שמש",
    deal: "מכירה",
    price: 1_390_000,
    neighborhood: "קריית נורדאו",
    address: "רחוב [להשלמה], קריית נורדאו, נתניה",
    rooms: 4,
    size: 96,
    floor: "3 מתוך 6",
    tag: "חדש",
    features: { mamad: true, elevator: true, parking: true, balcony: true },
    description:
      "דירה מוארת ומאווררת בבניין מטופח, קרובה לגנים, בתי ספר ומרכז מסחרי. מתאימה למשפחה צעירה או להשקעה בתשואה נאה.",
    images: [prop1, prop3, prop4],
  },
  {
    id: "p2",
    title: "דירת 3 חדרים משופצת קרוב לים",
    deal: "מכירה",
    price: 1_650_000,
    neighborhood: "מרכז העיר",
    address: "רחוב [להשלמה], מרכז העיר, נתניה",
    rooms: 3,
    size: 78,
    floor: "2 מתוך 4",
    features: { mamad: false, elevator: false, parking: false, balcony: true },
    description:
      "דירה משופצת מהיסוד במרכז העיר, מטרים ספורים מהטיילת ומהמסעדות. אידיאלית לזוגות ולהשקעה לטווח קצר.",
    images: [prop3, prop1, prop2],
  },
  {
    id: "p3",
    title: "דירת גן 4 חדרים עם חצר פרטית",
    deal: "מכירה",
    price: 1_990_000,
    neighborhood: "עיר ימים",
    address: "רחוב [להשלמה], עיר ימים, נתניה",
    rooms: 4,
    size: 108,
    floor: "קרקע",
    tag: "בלעדי",
    features: { mamad: true, elevator: true, parking: true, balcony: false },
    description:
      "דירת גן בבניין בוטיק, חצר פרטית מרוצפת, ממ״ד וחניה בטאבו. שכנות איכותית ומרחק הליכה מהחוף.",
    images: [prop2, prop4, prop1],
  },
  {
    id: "p4",
    title: "פנטהאוז 5 חדרים עם נוף לים",
    deal: "מכירה",
    price: 2_600_000,
    neighborhood: "רמת פולג",
    address: "רחוב [להשלמה], רמת פולג, נתניה",
    rooms: 5,
    size: 140,
    floor: "9 מתוך 9",
    tag: "בלעדי",
    features: { mamad: true, elevator: true, parking: true, balcony: true },
    description:
      "פנטהאוז מפואר עם מרפסת גג ענקית ונוף פתוח לים. שתי חניות, מחסן, מיזוג מיני מרכזי ומטבח מעוצב.",
    images: [prop1, prop4, prop2],
  },
  {
    id: "p5",
    title: "דירת 3.5 חדרים בבניין חדש",
    deal: "מכירה",
    price: 1_780_000,
    neighborhood: "אזורים",
    address: "רחוב [להשלמה], שכונת אזורים, נתניה",
    rooms: 3.5,
    size: 85,
    floor: "5 מתוך 8",
    features: { mamad: true, elevator: true, parking: true, balcony: true },
    description:
      "דירה בבניין חדש עם לובי מעוצב, ממ״ד, חניה תת קרקעית ומרפסת שמש. כניסה מיידית.",
    images: [prop4, prop3, prop2],
  },
  {
    id: "p6",
    title: "דירת 2 חדרים להשקעה במרכז",
    deal: "השכרה",
    price: 1_300_000,
    neighborhood: "קריית השרון",
    address: "רחוב [להשלמה], קריית השרון, נתניה",
    rooms: 2,
    size: 55,
    floor: "1 מתוך 4",
    tag: "חדש",
    features: { mamad: false, elevator: false, parking: true, balcony: true },
    description:
      "דירה קומפקטית ומשופצת עם שוכר קיים ותשואה יציבה. נקודת פתיחה מעולה למשקיעים.",
    images: [prop3, prop2, prop1],
  },
];

export const neighborhoods = [
  "מרכז העיר",
  "קריית נורדאו",
  "עיר ימים",
  "רמת פולג",
  "אזורים",
  "קריית השרון",
];

export const priceRanges = [
  { label: "עד 1,500,000 ₪", min: 0, max: 1_500_000 },
  { label: "1,500,000 – 2,000,000 ₪", min: 1_500_000, max: 2_000_000 },
  { label: "2,000,000 ₪ ומעלה", min: 2_000_000, max: Infinity },
];

export const formatPrice = (n: number) => `${n.toLocaleString("he-IL")} ₪`;

/* ---------------------------- עדויות [תוכן להשלמה] ---------------------------- */

export const testimonials = [
  { quote: "מכרנו את הדירה תוך שלושה שבועות במחיר גבוה ממה שציפינו. ליווי צמוד בכל שלב. [להשלמה]", name: "רונית ל.", type: "מכר דירה" },
  { quote: "קיבלתי נכסים בוואטסאפ לפני שהם עלו לאינטרנט, וכך סגרנו את הדירה הראשונה שלנו. [להשלמה]", name: "אביב מ.", type: "קנה דירה" },
  { quote: "הערכת השווי הייתה מדויקת ומקצועית, בלי לחץ ובלי התחייבות. [להשלמה]", name: "יוסי ד.", type: "מכר דירה" },
  { quote: "בניתי איתם תיק של שתי דירות להשקעה בנתניה, הכל מלווה במספרים. [להשלמה]", name: "מיכל ש.", type: "השקיע" },
  { quote: "מכירים כל רחוב בעיר וחסכו לנו זמן בבחירת השכונה הנכונה. [להשלמה]", name: "דנה ק.", type: "קנה דירה" },
  { quote: "שירות אישי וזמינות גם בערב. ממש נדיר בתחום הזה. [להשלמה]", name: "אלכס ב.", type: "מכר דירה" },
];

/* ---------------------------- שאלות נפוצות ---------------------------- */

export const faq = [
  {
    q: "כמה עולה שירות תיווך?",
    a: "דמי התיווך נקבעים מראש בהסכם בכתב, בהתאם לסוג העסקה ולהיקפה, ומשולמים רק בסיום עסקה מוצלחת. הכל שקוף ומוסכם לפני שמתחילים.",
  },
  {
    q: "כמה זמן לוקח למכור דירה בנתניה?",
    a: "בשוק הנוכחי דירה שמתומחרת נכון נמכרת בדרך כלל בין שבועיים לשלושה חודשים. תמחור מדויק בתחילת הדרך הוא הגורם המשמעותי ביותר.",
  },
  {
    q: "האם ההערכה באמת חינם?",
    a: "כן. הערכת השווי ניתנת ללא עלות וללא התחייבות, גם אם תחליטו בסוף לא למכור או לא לעבוד איתנו.",
  },
  {
    q: "אתם עובדים בבלעדיות?",
    a: "אנחנו מציעים גם שיווק בבלעדיות וגם שיווק רגיל. בבלעדיות אנחנו משקיעים תקציב וזמן שיווק גדולים יותר, אך ההחלטה תמיד שלכם.",
  },
  {
    q: "אילו שכונות אתם מכסים?",
    a: "כל נתניה והסביבה: מרכז העיר, קריית נורדאו, עיר ימים, רמת פולג, אזורים, קריית השרון ועוד.",
  },
  {
    q: "מה צריך להביא לפגישה ראשונה?",
    a: "נסח טאבו או אישור זכויות, תשריט הדירה אם קיים, ופרטים על שיפוצים ותוספות. אם אין — נעזור להשיג.",
  },
];
