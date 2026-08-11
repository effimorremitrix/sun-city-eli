import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";

/* ============================================================
 * כל התוכן הניתן לעריכה מרוכז בקובץ הזה.
 * ============================================================ */

export const business = {
  name: 'סאן סיטי נדל"ן',
  nameEn: "SUN CITY",
  tagline: "מכירה | קנייה | השכרת נכסים",
  address: "שמואל הנציב 20, נתניה, קומת קרקע (ליד בנק מרכנתיל)",
  addressShort: "שמואל הנציב 20, נתניה",
  phone: "073-2113213",
  phoneIntl: "972732113213",
  email: "sun.city.netanya@gmail.com",
  areaServed: "נתניה והסביבה",
  hours: [
    { day: "ראשון – חמישי", value: "09:00 – 19:00" },
    { day: "שישי", value: "09:00 – 13:00" },
    { day: "שבת", value: "סגור" },
  ],
  whatsappGroup: {
    name: 'זה הזמן לקנות נדל"ן',
    members: 945,
    url: "[להשלמה]", // קישור לקבוצת הוואטסאפ
  },
  yad2Url: "[להשלמה]", // קישור לדף הסוכנות ביד2
  social: {
    facebook: "[להשלמה]",
    instagram: "[להשלמה]",
  },
};

/** סטטיסטיקות ההירו — לעדכון מול המשרד */
export const stats = [
  { value: "[X]", label: "עסקאות שנסגרו" },
  { value: "[X]", label: "שנות ניסיון" },
  { value: "945", label: "חברים בקבוצת הנכסים" },
];

export const mapsEmbedUrl =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("שמואל הנציב 20, נתניה") +
  "&output=embed";

export const whatsappLink = (text: string) =>
  `https://wa.me/${business.phoneIntl}?text=${encodeURIComponent(text)}`;

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
  tag?: "חדש" | "במכירה בלעדית";
  features: { mamad: boolean; elevator: boolean; parking: boolean; balcony: boolean };
  description: string;
  images: string[];
};

export const properties: Property[] = [
  {
    id: "p1",
    title: 'דירת 4 חדרים מרווחת עם מרפסת שמש',
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
    tag: "במכירה בלעדית",
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
    tag: "במכירה בלעדית",
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
    deal: "מכירה",
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

/* ---------------------------- השקעות ושירותים ---------------------------- */

export const investments = [
  {
    title: "דירות להשקעה בנתניה",
    text: "איתור דירות עם פוטנציאל השבחה ותשואה, כולל בדיקת שכירות ריאלית באזור.",
  },
  {
    title: "נכסים מניבים",
    text: "חנויות, משרדים ודירות עם שוכרים קיימים — הכנסה חודשית מהיום הראשון.",
  },
  {
    title: "ליווי משקיעים",
    text: "בניית תיק נכסים, חישוב תשואה, מיסוי ומשכנתא — ליווי מקצה לקצה.",
  },
];

export const services = [
  { title: 'ייעוץ נדל"ן', text: "מפגש אבחון אישי והתאמת אסטרטגיה לנכס ולתקציב." },
  { title: "הערכת שווי נכסים", text: "הערכה מבוססת עסקאות אמיתיות שנסגרו באזור." },
  { title: 'תיווך וניהול מו"מ', text: "שיווק ממוקד וניהול מו״מ עד לחתימה על החוזה." },
  { title: "ליווי משפטי ומשכנתאות", text: "חיבור לעורכי דין ויועצי משכנתאות מנוסים." },
];

/* ---------------------------- צוות ---------------------------- */

export const team = [
  {
    name: "[להשלמה]",
    role: "בעל המשרד ומתווך מוסמך",
    area: "מרכז העיר ורמת פולג",
    phone: business.phone,
  },
  {
    name: "[להשלמה]",
    role: "סוכנת נדל״ן",
    area: "קריית נורדאו ואזורים",
    phone: business.phone,
  },
  {
    name: "[להשלמה]",
    role: "סוכן נדל״ן ומשקיעים",
    area: "עיר ימים וקריית השרון",
    phone: business.phone,
  },
];

/* ---------------------------- עדויות ---------------------------- */

export const testimonials = [
  { quote: "מכרנו את הדירה תוך שלושה שבועות במחיר גבוה ממה שציפינו. ליווי צמוד בכל שלב.", name: "רונית ל.", type: "מכר דירה" },
  { quote: "קיבלתי נכסים בוואטסאפ לפני שהם עלו לאינטרנט, וכך סגרנו את הדירה הראשונה שלנו.", name: "אביב מ.", type: "קנה דירה" },
  { quote: "הערכת השווי הייתה מדויקת ומקצועית, בלי לחץ ובלי התחייבות. יושרה אמיתית.", name: "יוסי ד.", type: "מכר דירה" },
  { quote: "בניתי איתם תיק של שתי דירות להשקעה בנתניה. הכל מלווה במספרים ולא בהבטחות.", name: "מיכל ש.", type: "השקיע" },
  { quote: "מכירים כל רחוב בעיר. חסכו לנו זמן וכסף בבחירת השכונה הנכונה למשפחה.", name: "דנה ק.", type: "קנה דירה" },
  { quote: "שירות אישי, זמינים בטלפון גם בערב. ממש נדיר בתחום הזה.", name: "אלכס ב.", type: "מכר דירה" },
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
