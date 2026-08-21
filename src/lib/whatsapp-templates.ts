/**
 * תבניות ההודעות ל-WhatsApp Business API.
 *
 * בערוץ הרשמי (WABA) אי אפשר לשלוח טקסט חופשי ביוזמת העסק — כל הודעה יזומה
 * חייבת להיות תבנית מאושרת מראש על ידי מטא, שאליה מזריקים פרמטרים.
 * הקובץ הזה הוא מקור האמת לנוסח התבניות ולסדר הפרמטרים שלהן: את הגוף מעתיקים
 * כמו שהוא למסך יצירת התבנית (WhatsApp Manager או קונסולת GREEN-API).
 *
 * כללי מטא שהנוסחים כאן עומדים בהם — שינוי נוסח חייב לשמור עליהם:
 * - הגוף לא מתחיל ולא מסתיים במשתנה, ואין שני משתנים צמודים.
 * - המספור רציף מ-{{1}}, ואין יותר משתי שורות ריקות רצופות.
 * - ערך של פרמטר לא יכול להכיל שורה חדשה, טאב או 4 רווחים רצופים, ולא להיות ריק.
 *
 * הקובץ איזומורפי בכוונה (בלי סודות ובלי process.env) — הנוסחים יכולים
 * להיות מוצגים גם במדריך למנהל.
 */

export type WaTemplateKey = "new_listing_client" | "agent_matches" | "admin_copy";

/** ערך גולמי לפרמטר — מנורמל למחרוזת חוקית ב-sanitizeParam */
export type WaParamValue = string | number | null | undefined;

/** הערכים שכל תבנית מצפה להם. השמות כאן הם המפתחות ב-fields, לפי הסדר. */
export type WaTemplateValues = {
  new_listing_client: {
    profileLabel: WaParamValue;
    title: WaParamValue;
    neighborhood: WaParamValue;
    rooms: WaParamValue;
    sizeSqm: WaParamValue;
    price: WaParamValue;
    agentContact: WaParamValue;
    siteUrl: WaParamValue;
  };
  agent_matches: {
    clientCount: WaParamValue;
    title: WaParamValue;
    neighborhood: WaParamValue;
    rooms: WaParamValue;
    sizeSqm: WaParamValue;
    price: WaParamValue;
    clients: WaParamValue;
    siteUrl: WaParamValue;
  };
  admin_copy: {
    siteName: WaParamValue;
    title: WaParamValue;
    clientCount: WaParamValue;
    neighborhood: WaParamValue;
    rooms: WaParamValue;
    sizeSqm: WaParamValue;
    price: WaParamValue;
    clients: WaParamValue;
    siteUrl: WaParamValue;
  };
};

export type WaTemplateSpec<K extends WaTemplateKey> = {
  /** משתנה הסביבה שמחזיק את המזהה: ב-GREEN-API ה-templateId (UUID), במטא שם התבנית */
  envVar: string;
  /** שם התבנית להגשה במטא */
  metaName: string;
  language: string;
  category: "UTILITY" | "MARKETING";
  /** סדר הפרמטרים — האיבר במקום i הוא {{i+1}} בגוף התבנית */
  fields: ReadonlyArray<keyof WaTemplateValues[K]>;
  /** גוף התבנית להעתקה למסך ההגשה */
  body: string;
  /** ערכי דוגמה להגשה, לפי סדר fields */
  samples: readonly string[];
};

export const WA_TEMPLATES: { [K in WaTemplateKey]: WaTemplateSpec<K> } = {
  // התראה ללקוח על נכס חדש שתואם לפרופיל החיפוש שלו.
  // MARKETING ולא UTILITY: זו הצעת נכס יזומה ולא המשך לפעולה של הלקוח.
  // השורה האחרונה היא גם דרך ההסרה שמטא מצפה לה בתבנית שיווקית.
  new_listing_client: {
    envVar: "WA_TEMPLATE_NEW_LISTING",
    metaName: "sun_city_new_listing",
    language: "he",
    category: "MARKETING",
    fields: [
      "profileLabel",
      "title",
      "neighborhood",
      "rooms",
      "sizeSqm",
      "price",
      "agentContact",
      "siteUrl",
    ],
    body: [
      'שלום! נכס חדש שמתאים לחיפוש שלך "{{1}}":',
      "{{2}}",
      'שכונה: {{3}} · חדרים: {{4}} · {{5}} מ"ר',
      "מחיר: {{6}}",
      "לפרטים ותיאום צפייה: {{7}}",
      "לצפייה באתר: {{8}}",
      'סאן סיטי נדל"ן — להפסקת ההתראות בטלו את הסימון באזור האישי באתר',
    ].join("\n"),
    samples: [
      "דירת 4 חדרים בעיר העתיקה",
      "דירה מרווחת ברחוב הרצל",
      "מרכז העיר",
      "4",
      "102",
      "2,450,000 ₪",
      "אלי כהן: https://wa.me/972501234567",
      "https://sun-city-eli.lovable.app/#properties",
    ],
  },

  // התראה לסוכן המפרסם על כך שהנכס שלו הותאם ללקוחות ונשלחו אליהם התראות.
  agent_matches: {
    envVar: "WA_TEMPLATE_AGENT_MATCHES",
    metaName: "sun_city_agent_matches",
    language: "he",
    category: "UTILITY",
    fields: [
      "clientCount",
      "title",
      "neighborhood",
      "rooms",
      "sizeSqm",
      "price",
      "clients",
      "siteUrl",
    ],
    body: [
      "הנכס שפרסמת הותאם ל-{{1}} לקוחות והם קיבלו התראה.",
      "הנכס: {{2}}",
      'שכונה: {{3}} · חדרים: {{4}} · {{5}} מ"ר · מחיר: {{6}}',
      "הלקוחות: {{7}}",
      "לצפייה במערכת: {{8}}",
      "פרטי הלקוחות המלאים נשלחו אליך במייל.",
    ].join("\n"),
    samples: [
      "3",
      "דירה מרווחת ברחוב הרצל",
      "מרכז העיר",
      "4",
      "102",
      "2,450,000 ₪",
      "דנה כהן (4 חדרים) · יוסי לוי (פנטהאוז) · ועוד 1",
      "https://sun-city-eli.lovable.app/#properties",
    ],
  },

  // עותק למנהל הראשי על כל התראה שנשלחה מאתר של סוכן.
  admin_copy: {
    envVar: "WA_TEMPLATE_ADMIN_COPY",
    metaName: "sun_city_admin_copy",
    language: "he",
    category: "UTILITY",
    fields: [
      "siteName",
      "title",
      "clientCount",
      "neighborhood",
      "rooms",
      "sizeSqm",
      "price",
      "clients",
      "siteUrl",
    ],
    body: [
      "[עותק מנהל] התראות נשלחו ללקוחות.",
      "אתר: {{1}}",
      "הנכס: {{2}} הותאם ל-{{3}} לקוחות.",
      'שכונה: {{4}} · חדרים: {{5}} · {{6}} מ"ר · מחיר: {{7}}',
      "הלקוחות: {{8}}",
      "לצפייה במערכת: {{9}}",
      'סאן סיטי נדל"ן',
    ].join("\n"),
    samples: [
      'סאן סיטי נדל"ן',
      "דירה מרווחת ברחוב הרצל",
      "3",
      "מרכז העיר",
      "4",
      "102",
      "2,450,000 ₪",
      "דנה כהן (4 חדרים) · ועוד 2",
      "https://sun-city-eli.lovable.app/#properties",
    ],
  },
};

/** ברירת המחדל שמוצגת כשאין נתון — זהה לנוסח שכבר בשימוש בהתראות */
const EMPTY_FALLBACK = "אין מידע";

/** אורך מקסימלי לפרמטר בודד. מטא מגבילה את הגוף כולו ל-1024 תווים. */
const MAX_PARAM_LENGTH = 300;

/**
 * נרמול ערך לפרמטר חוקי של תבנית: מסיר תווי בקרה ומכווץ כל רצף רווחים לרווח
 * אחד — מה שמנטרל בבת אחת שורות חדשות, טאבים ו-4 רווחים רצופים, בדיוק שלושת
 * הדברים שמטא דוחה. ערך ריק מוחלף בברירת מחדל, כי פרמטר ריק נדחה גם הוא.
 */
export function sanitizeParam(
  value: WaParamValue,
  opts?: { fallback?: string; max?: number },
): string {
  const max = opts?.max ?? MAX_PARAM_LENGTH;
  const cleaned = String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return opts?.fallback ?? EMPTY_FALLBACK;
  if (cleaned.length <= max) return cleaned;

  const cut = cleaned.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * בונה את מערך הפרמטרים לפי סדר ה-fields של התבנית.
 * נקרא רק מתוך whatsapp.server.ts — כך שאי אפשר לעקוף את הנרמול.
 */
export function buildParams<K extends WaTemplateKey>(
  key: K,
  values: WaTemplateValues[K],
): string[] {
  const spec = WA_TEMPLATES[key] as WaTemplateSpec<K>;
  return spec.fields.map((field) => sanitizeParam(values[field] as WaParamValue));
}

/**
 * שטוח את רשימת הלקוחות לשורה אחת שמתאימה לפרמטר של תבנית.
 * המיילים יורדים כאן במכוון — הם מנפחים את האורך, וההתראה המקבילה במייל
 * ממילא מפרטת אותם במלואם.
 */
export function formatClientList(
  recipients: ReadonlyArray<{ name: string | null; profileLabel: string }>,
  max = 5,
): string {
  if (!recipients.length) return EMPTY_FALLBACK;
  const shown = recipients
    .slice(0, max)
    .map((r) => `${r.name ?? "לקוח/ה"} (${r.profileLabel})`)
    .join(" · ");
  const rest = recipients.length - max;
  return rest > 0 ? `${shown} · ועוד ${rest}` : shown;
}
