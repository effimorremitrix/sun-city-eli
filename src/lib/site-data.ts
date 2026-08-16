import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";
import prop7 from "@/assets/prop-7.jpg";
import prop8 from "@/assets/prop-8.jpg";
import agentInbal from "@/assets/agent-inbal.jpg.asset.json";
import agentKobi from "@/assets/agent-kobi.jpg.asset.json";
import agentYelena from "@/assets/agent-yelena.jpg.asset.json";
import agentElad from "@/assets/agent-elad.jpg.asset.json";
import agentKoral from "@/assets/agent-koral.jpg.asset.json";
import agentDaniel from "@/assets/agent-daniel.jpg.asset.json";
import agentEli from "@/assets/agent-eli.jpg.asset.json";

/* ============================================================
 * SITE_CONFIG — מספר טלפון אחד בלבד לכל האתר, וכל הקישורים במקום אחד.
 * ============================================================ */

const PHONE = "052-5551200";

export const SITE_CONFIG = {
  name: 'סאן סיטי נדל"ן',
  nameEn: "Sun City",
  tagline: "מחברים בין אנשים לנכסים",
  subtitle: "מכירה | קנייה | השכרת נכסים",
  address: "רחוב שמואל הנציב 20, נתניה, קומת קרקע (ליד בנק מרכנתיל)",
  addressShort: "שמואל הנציב 20, נתניה",
  /** מספר יחיד לכל האתר — אלי כליף */
  phone: PHONE,
  phoneTel: "0525551200",
  email: "kalifeli.suncity@gmail.com",
  license: "30723354",
  areaServed: "נתניה והסביבה",
  coords: { lat: 32.3303316, lng: 34.8567176 },
  hours: [
    { day: "ראשון – חמישי", value: "09:00 – 20:00" },
    { day: "שישי", value: "09:00 – 13:00" },
    { day: "שבת", value: "סגור" },
  ],
  whatsappGroup: {
    name: 'זה הזמן לקנות נדל"ן',
    url1: "https://chat.whatsapp.com/InToWeKYOS5H2u8NsQfWqA?s=cl&p=a&mlu=0",
    url2: "https://chat.whatsapp.com/EIJojHTrOCfDjo1D2ZOWCR?s=cl&p=a&mlu=0",
  },
  madlanUrl: "https://www.madlan.co.il/agentsOffice/re_office_cFjv57RxrAL",
  yad2Url: "https://www.yad2.co.il/realestate/agency/7607728/forsale",
  social: {
    facebook: "https://www.facebook.com/share/199jyqdNZY/",
    instagram:
      "https://www.instagram.com/kalif.eli_sun_city?igsh=MXZ1NmIyYjhoYWljcw==",
    tiktok: "https://www.tiktok.com/@elikalif.suncity?_r=1&_t=ZS-98vPBhf7ZcG2",
  },
  badges: [
    'בין 10 משרדי התיווך המובילים בנתניה, בדירוג מדל"ן 2023-2026',
    "מעל 55 חוות דעת מלקוחות",
    "5.0 כוכבים בגוגל",
  ],
  badge: 'בין 10 משרדי התיווך המובילים בנתניה, בדירוג מדל"ן 2023-2026',
  successFeeNote: "תשלום על בסיס הצלחה בלבד, משלמים רק כשסוגרים עסקה.",
};

/** שם נוח לשימוש בקומפוננטות */
export const business = SITE_CONFIG;

const { lat, lng } = SITE_CONFIG.coords;

export const wazeUrl = `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
export const mapsEmbedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`;

/* ---------------------------- וואטסאפ ---------------------------- */
/** מקור אמת אחד ויחיד לכל קישורי הוואטסאפ באתר. אין להרכיב קישור ידנית בשום מקום. */

export const WA_PHONE = "0525551200";

export const toIntl = (p: string) => "972" + p.replace(/\D/g, "").replace(/^0/, "");

/** קישור wa.me התקני – מקור אמת יחיד. phone הוא מספר הסוכן של הדף הנוכחי. */
export const buildWa = (msg: string, phone: string = WA_PHONE) =>
  "https://wa.me/" + toIntl(phone) + "?text=" + encodeURIComponent(msg);

/** הפונקציה היחידה לפתיחת וואטסאפ בכל האתר */
export const openWa = (msg: string, phone?: string) =>
  window.open(buildWa(msg, phone), "_blank", "noopener,noreferrer");


/** props לקישור/כפתור וואטסאפ – מבטיח שהפתיחה תמיד עוברת דרך openWa */
export const waProps = (msg: string, phone?: string) => ({
  href: buildWa(msg, phone),
  target: "_blank" as const,
  rel: "noopener noreferrer",
  onClick: (e: { preventDefault: () => void }) => {
    e.preventDefault();
    openWa(msg, phone);
  },
});

/** שמות תאימות – מפנים לאותה פונקציה יחידה */
export const whatsappLink = (text: string, phone?: string) => buildWa(text, phone);
export const agentWhatsappLink = (phone: string, text: string) => buildWa(text, phone);


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

/* ---------------------------- צוות ----------------------------
 * התמונות יועלו ידנית. שמות המקומות השמורים: photo1 עד photo7.
 * לאחר העלאת התמונה לקובץ src/assets/photo1.jpg יש לייבא אותה
 * ולהציב בשדה image של הסוכן המתאים.
 * ------------------------------------------------------------- */

export type Agent = {
  name: string;
  role: string;
  photo: string;
  image?: string;
  /** רק לאלי כליף יש טלפון אישי (המספר היחיד באתר) */
  phone?: string;
};

export const team: Agent[] = [
  {
    name: "אלי כליף",
    role: 'שותף ובעלים, מומחה נדל"ן דרום נתניה',
    photo: "photo1",
    image: agentEli.url,
    phone: PHONE,
  },
  {
    name: "עינבל קובל בוזגלו",
    role: "מנהלת הצוות ושותפה, מומחית לדירות יד שנייה",
    photo: "photo2",
    image: agentInbal.url,
  },
  {
    name: "קובי בוזגלו",
    role: 'יועץ נדל"ן ומשכנתאות, מרכז וצפון נתניה ותושבי חוץ',
    photo: "photo3",
    image: agentKobi.url,
  },
  {
    name: "ילנה גנדלין",
    role: 'מומחית נדל"ן, מזרח ודרום נתניה, דוברת רוסית',
    photo: "photo4",
    image: agentYelena.url,
  },
  {
    name: "אלעד אבוטבול",
    role: "מומחה לדירות יד שנייה, מרכז ודרום נתניה",
    photo: "photo5",
    image: agentElad.url,
  },
  {
    name: "קוראל בוחבוט",
    role: 'יועצת נדל"ן, הערכות שווי וליווי תושבי חוץ',
    photo: "photo6",
    image: agentKoral.url,
  },
  {
    name: "דניאל מוצא",
    role: 'מומחה נדל"ן, דרום נתניה',
    photo: "photo7",
    image: agentDaniel.url,
  },
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
    id: "prop1",
    title: 'דירת 5 חדרים, 166 מ"ר, שלום עליכם 15',
    deal: "מכירה",
    price: 3_540_000,
    neighborhood: "אגמים",
    address: "שלום עליכם 15, אגמים, נתניה",
    rooms: 5,
    size: 166,
    floor: "8",
    tag: "בלעדי",
    features: { mamad: true, elevator: true, parking: true, balcony: true },
    description:
      'דירת 5 חדרים מרווחת בשכונת אגמים, 166 מ"ר בקומה 8. נכס בבלעדיות המשרד.',
    images: [prop1],
  },
  {
    id: "prop2",
    title: 'בית דו משפחתי 4 חדרים, 370 מ"ר, אפרים אהרונסון 26',
    deal: "מכירה",
    price: 3_990_000,
    neighborhood: "רמת אפרים",
    address: "אפרים אהרונסון 26, רמת אפרים, נתניה",
    rooms: 4,
    size: 370,
    floor: "קרקע",
    tag: "בלעדי",
    features: { mamad: true, elevator: false, parking: true, balcony: true },
    description:
      'בית דו משפחתי ברמת אפרים, 4 חדרים, 370 מ"ר בקומת קרקע. נכס בבלעדיות המשרד.',
    images: [prop2],
  },
  {
    id: "prop3",
    title: 'דירת 4 חדרים, 112 מ"ר, שבטי ישראל 19',
    deal: "מכירה",
    price: 2_395_000,
    neighborhood: "קריית השרון",
    address: "שבטי ישראל 19, קריית השרון, נתניה",
    rooms: 4,
    size: 112,
    floor: "8",
    tag: "בלעדי",
    features: { mamad: true, elevator: true, parking: true, balcony: true },
    description:
      'דירת 4 חדרים בקריית השרון, 112 מ"ר בקומה 8, עם חניה וממ"ד. נכס בבלעדיות המשרד.',
    images: [prop3],
  },
  {
    id: "prop4",
    title: 'דירת 4 חדרים, 92 מ"ר, שמואל הנציב 39',
    deal: "מכירה",
    price: 1_830_000,
    neighborhood: "צפון מערב מרכז העיר",
    address: "שמואל הנציב 39, צפון מערב מרכז העיר, נתניה",
    rooms: 4,
    size: 92,
    floor: "3",
    tag: "בלעדי",
    features: { mamad: false, elevator: true, parking: false, balcony: true },
    description:
      'דירת 4 חדרים בצפון מערב מרכז העיר, 92 מ"ר בקומה 3. נכס בבלעדיות המשרד.',
    images: [prop4],
  },
  {
    id: "prop5",
    title: 'דירת 4 חדרים, 90 מ"ר, יהודה הנשיא 15',
    deal: "מכירה",
    price: 1_850_000,
    neighborhood: "צפון מערב מרכז העיר",
    address: "יהודה הנשיא 15, צפון מערב מרכז העיר, נתניה",
    rooms: 4,
    size: 90,
    floor: "3",
    tag: "בלעדי",
    features: { mamad: false, elevator: true, parking: false, balcony: true },
    description:
      'דירת 4 חדרים בצפון מערב מרכז העיר, 90 מ"ר בקומה 3. נכס בבלעדיות המשרד.',
    images: [prop5],
  },
  {
    id: "prop6",
    title: 'דירת 4 חדרים, 95 מ"ר, הרב קוק 43',
    deal: "מכירה",
    price: 1_790_000,
    neighborhood: "צפון מערב מרכז העיר",
    address: "הרב קוק 43, צפון מערב מרכז העיר, נתניה",
    rooms: 4,
    size: 95,
    floor: "8",
    features: { mamad: false, elevator: true, parking: true, balcony: true },
    description:
      'דירת 4 חדרים, 95 מ"ר בקומה 8, עם חניה ובמרחק קצר מהים.',
    images: [prop6],
  },
  {
    id: "prop7",
    title: 'דירת 4 חדרים, 94 מ"ר, יהודה הלוי 26',
    deal: "מכירה",
    price: 1_790_000,
    neighborhood: "מרכז העיר",
    address: "יהודה הלוי 26, מרכז העיר דרום, נתניה",
    rooms: 4,
    size: 94,
    floor: "5",
    tag: "בלעדי",
    features: { mamad: false, elevator: true, parking: false, balcony: true },
    description: 'דירת 4 חדרים במרכז העיר דרום, 94 מ"ר בקומה 5. נכס בבלעדיות המשרד.',
    images: [prop7],
  },
  {
    id: "prop8",
    title: 'דירת 4 חדרים, 79 מ"ר, בנימין מינץ 8',
    deal: "מכירה",
    price: 1_590_000,
    neighborhood: "נאות הרצל",
    address: "בנימין מינץ 8, נאות הרצל, נתניה",
    rooms: 4,
    size: 79,
    floor: "2",
    tag: "בלעדי",
    features: { mamad: false, elevator: true, parking: false, balcony: true },
    description: 'דירת 4 חדרים בנאות הרצל, 79 מ"ר בקומה 2. נכס בבלעדיות המשרד.',
    images: [prop8],
  },
];

export const neighborhoods = [
  "קריית השרון",
  "קריית נורדאו",
  "קריית צאנז",
  "רמת אפרים",
  "רמת פולג",
  "עיר ימים",
  "נאות הרצל",
  "אגמים",
  "פרדס הגדוד",
  "מרכז העיר",
  "צפון מערב מרכז העיר",
  "נוף הטיילת",
  "עין התכלת",
  "גבעת האירוסים",
];

export const priceRanges = [
  { label: "עד 1,500,000 ₪", min: 0, max: 1_500_000 },
  { label: "1,500,000 – 2,000,000 ₪", min: 1_500_000, max: 2_000_000 },
  { label: "2,000,000 ₪ ומעלה", min: 2_000_000, max: Infinity },
];

export const formatPrice = (n: number) => `${n.toLocaleString("he-IL")} ₪`;

/* ---------------------------- המלצות ---------------------------- */

export const testimonials = [
  {
    quote:
      "אני רוצה להודות על העבודה המעולה במכירת הדירה. כבר בשיחה הראשונה הרגשתי חיבור אמיתי וביטחון. קיבלתי הרבה יותר ממה שציפיתי ובעיקר שקט נפשי.",
    name: "אריקה ש.",
    type: "קניית דירה בנתניה",
  },
  {
    quote:
      "עבודה מקצועית, מסורה ובלתי פוסקת. תמיד עבדה, תמיד שיווקה, תמיד הביאה קונים. הכרתי לא מעט מתווכים, אבל מתווכת כזאת עוד לא פגשתי.",
    name: "אנה ק.",
    type: "מכירת דירה בנתניה",
  },
  {
    quote:
      "צוות יוצא דופן. תקשורת פתוחה, שקיפות מלאה ותחושת ביטחון. ידענו בכל שלב מה קורה. הזמינות שלהם הייתה בלתי מתפשרת.",
    name: "אריק",
    type: "מכירת דירה",
  },
  {
    quote:
      'ליווי וניהול מו"מ מושלמים לכל אורכו. מקצועיות, שיקול דעת ושירותיות בהכי הכי שאפשר.',
    name: "שראל ד.",
    type: "קניית דירה להשקעה",
  },
  {
    quote:
      "ראינו כמה מתווכים ובחרנו בהם כי הם אנשים אותנטיים ונעימים. עשו עבורנו עבודה מופלאה בתקופה מאתגרת.",
    name: "אוריאל נ.",
    type: "נתניה",
  },
  {
    quote:
      "אחרי שלא הצלחתי להשכיר בעצמי, פניתי למשרד ומצאתי מתווך רציני והגון שמציב מטרה ולא נח עד שמשיג אותה.",
    name: "דני א.",
    type: "ביקורת גוגל",
  },
];

/* ---------------------------- שאלות נפוצות ---------------------------- */

export const faq = [
  {
    q: "כמה עולה שירות תיווך?",
    a: "התשלום הוא על בסיס הצלחה בלבד — משלמים רק כשסוגרים עסקה. דמי התיווך נקבעים מראש בהסכם בכתב, בהתאם לסוג העסקה ולהיקפה.",
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
    a: "כן, אנחנו עובדים בבלעדיות בלבד. בלעדיות מאפשרת לנו להשקיע בנכס שלכם תקציב שיווק מלא, לשלוט במחיר ובאופן הצגת הנכס מול כל הקונים, ולתת לכם דיווח שוטף ואחיד מגורם אחד שאחראי על התוצאה מתחילת הדרך ועד סגירת העסקה.",
  },
  {
    q: "אילו שכונות אתם מכסים?",
    a: "כל נתניה והסביבה: מרכז העיר, קריית השרון, קריית נורדאו, קריית צאנז, רמת אפרים, רמת פולג, עיר ימים, נאות הרצל, אגמים, פרדס הגדוד, נוף הטיילת, עין התכלת וגבעת האירוסים.",
  },
  {
    q: "מה צריך להביא לפגישה ראשונה?",
    a: "נסח טאבו או אישור זכויות, תשריט הדירה אם קיים, ופרטים על שיפוצים ותוספות. אם אין — נעזור להשיג.",
  },
];
