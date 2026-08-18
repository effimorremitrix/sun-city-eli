import { createContext, useContext, type ReactNode } from "react";
import { SITE_CONFIG, team } from "@/lib/site-data";
import { DICTS, type Dict, type Locale } from "@/lib/i18n";

/** ============================================================
 * תוכן חי (Live content) — הנתונים שמנוהלים באזור הניהול.
 * ברירת המחדל היא הנתונים הסטטיים של האתר, כך שגם בלי חיבור
 * לבסיס הנתונים האתר מוצג במלואו.
 * ============================================================ */

export type LiveHour = { day: string; value: string };

export type LiveBusiness = {
  name: string;
  tagline: string;
  subtitle: string;
  address: string;
  phone: string;
  phoneTel: string;
  email: string;
  license: string;
  hours: LiveHour[];
  /* --- פרטי הסוכן האישי של הדף (אתר אישי לכל סוכן) --- */
  agentName: string;
  roleTitle: string;
  photoUrl: string;
  bio: string;
  social: { facebook: string; instagram: string; tiktok: string };
};

export type LiveTexts = {
  heroTitle: string;
  heroSubtitle: string;
};

/** תרגום פר-שפה של שדות התוכן הניתנים לעריכה (נשמר בעמודת translations) */
export type LiveContentTranslation = {
  texts?: Partial<LiveTexts>;
  business?: {
    name?: string;
    tagline?: string;
    subtitle?: string;
    address?: string;
    hours?: LiveHour[];
  };
};

export type LiveTranslations = Partial<Record<string, LiveContentTranslation>>;

export type LiveItemTranslation = {
  title?: string;
  description?: string;
  price_note?: string;
};

export type LiveItem = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  price: number | null;
  price_note: string | null;
  image_url: string | null;
  translations?: Partial<Record<string, LiveItemTranslation>> | null;
};

/** ממליץ/עדות לקוח — נערך באזור הניהול; videoUrl אופציונלי לסרטון המלצה */
export type LiveTestimonial = {
  id: string;
  name: string;
  type: string;
  quote: string;
  videoUrl?: string;
};

/** שאלה נפוצה — נערכת באזור הניהול */
export type LiveFaqItem = { id: string; q: string; a: string };

export type LiveSite = {
  business: LiveBusiness;
  texts: LiveTexts;
  items: LiveItem[];
  /** ממליצים מהמסד — null = להשתמש בתוכן הסטטי מהמילונים */
  testimonials: LiveTestimonial[] | null;
  /** שאלות נפוצות מהמסד — null = להשתמש בתוכן הסטטי מהמילונים */
  faq: LiveFaqItem[] | null;
  /** תרגומי התוכן שנשמרו במסד הנתונים, לפי קוד שפה */
  translations?: LiveTranslations;
  /** תאריך העדכון האחרון של התוכן במסד הנתונים (ISO) — null כשאין רשומה */
  updatedAt: string | null;
  /** מזהה ה-site במסד — null כשאין חיבור למסד */
  siteId: string | null;
  /** ה-slug הציבורי של הדף ("sun-city" לדף של אלי) */
  slug: string | null;
  /** האם נמצאה רשומת אתר במסד (false בדף של slug לא קיים) */
  found: boolean;
};

export const DEFAULT_TEXTS: LiveTexts = {
  heroTitle: 'ברוכים הבאים ל‑Sun City, סוכנות הנדל"ן שלכם בנתניה',
  heroSubtitle: `${SITE_CONFIG.tagline}. ליווי אישי ממכירה ועד מסירת מפתח.`,
};

export const DEFAULT_BUSINESS: LiveBusiness = {
  name: SITE_CONFIG.name,
  tagline: SITE_CONFIG.tagline,
  subtitle: SITE_CONFIG.subtitle,
  address: SITE_CONFIG.address,
  phone: SITE_CONFIG.phone,
  phoneTel: SITE_CONFIG.phoneTel,
  email: SITE_CONFIG.email,
  license: SITE_CONFIG.license,
  hours: SITE_CONFIG.hours,
  agentName: team[0]!.name,
  roleTitle: team[0]!.role,
  photoUrl: team[0]!.image ?? "",
  bio: "",
  social: { ...SITE_CONFIG.social },
};

export const DEFAULT_LIVE: LiveSite = {
  business: DEFAULT_BUSINESS,
  texts: DEFAULT_TEXTS,
  items: [],
  testimonials: null,
  faq: null,
  updatedAt: null,
  siteId: null,
  slug: null,
  found: false,
};

/** ממזג נתונים חלקיים מבסיס הנתונים עם ברירות המחדל */
export function mergeLive(raw: unknown): LiveSite {
  const data = (raw ?? {}) as {
    id?: string | null;
    slug?: string | null;
    business?: Partial<LiveBusiness>;
    texts?: Partial<LiveTexts>;
    items?: LiveItem[];
    testimonials?: LiveTestimonial[] | null;
    faq?: LiveFaqItem[] | null;
    translations?: LiveTranslations;
    updated_at?: string | null;
  };
  const business = { ...DEFAULT_BUSINESS, ...(data.business ?? {}) };
  if (!Array.isArray(business.hours) || business.hours.length === 0) {
    business.hours = DEFAULT_BUSINESS.hours;
  }
  business.social = { ...DEFAULT_BUSINESS.social, ...(business.social ?? {}) };
  return {
    business,
    texts: { ...DEFAULT_TEXTS, ...(data.texts ?? {}) },
    items: Array.isArray(data.items) ? data.items : [],
    testimonials:
      Array.isArray(data.testimonials) && data.testimonials.length > 0 ? data.testimonials : null,
    faq: Array.isArray(data.faq) && data.faq.length > 0 ? data.faq : null,
    translations:
      data.translations && typeof data.translations === "object" ? data.translations : {},
    updatedAt: data.updated_at ?? null,
    siteId: data.id ?? null,
    slug: data.slug ?? null,
    found: raw != null,
  };
}

/* ------------------------- לוקליזציה ------------------------- */

/**
 * בחירת ערך מתורגם לשדה תוכן:
 * 1. תרגום שנשמר במסד הנתונים (אם קיים) מנצח.
 * 2. אם התוכן העברי עדיין זהה לברירת המחדל של האתר — ברירת המחדל המתורגמת מהמילון.
 * 3. אחרת נופלים חזרה לתוכן העברי (דעיכה חיננית).
 */
const pickText = (
  dbTranslation: string | undefined,
  baseValue: string,
  hebrewDefault: string,
  dictDefault: string,
) => dbTranslation ?? (baseValue === hebrewDefault ? dictDefault : baseValue);

const localizeHours = (
  dbHours: LiveHour[] | undefined,
  baseHours: LiveHour[],
  t: Dict,
): LiveHour[] => {
  if (Array.isArray(dbHours) && dbHours.length > 0) return dbHours;
  // תרגום שמות הימים והערכים המוכרים; ערך לא מוכר נשאר כפי שהוא
  return baseHours.map((h) => ({
    day: t.maps.days[h.day] ?? h.day,
    value: t.maps.days[h.value] ?? h.value,
  }));
};

/** מחזיר עותק של התוכן החי בשפת העמוד, עם fallback פר-שדה לעברית */
export function localizeLive(live: LiveSite, lang: Locale, t: Dict): LiveSite {
  if (lang === "he") return live;
  const tr = live.translations?.[lang] ?? {};

  const business: LiveBusiness = {
    ...live.business,
    name: pickText(
      tr.business?.name,
      live.business.name,
      DEFAULT_BUSINESS.name,
      t.liveDefaults.name,
    ),
    tagline: pickText(
      tr.business?.tagline,
      live.business.tagline,
      DEFAULT_BUSINESS.tagline,
      t.liveDefaults.tagline,
    ),
    subtitle: pickText(
      tr.business?.subtitle,
      live.business.subtitle,
      DEFAULT_BUSINESS.subtitle,
      t.liveDefaults.subtitle,
    ),
    address: pickText(
      tr.business?.address,
      live.business.address,
      DEFAULT_BUSINESS.address,
      t.liveDefaults.address,
    ),
    hours: localizeHours(tr.business?.hours, live.business.hours, t),
  };

  const texts: LiveTexts = {
    heroTitle: pickText(
      tr.texts?.heroTitle,
      live.texts.heroTitle,
      DEFAULT_TEXTS.heroTitle,
      t.liveDefaults.heroTitle,
    ),
    heroSubtitle: pickText(
      tr.texts?.heroSubtitle,
      live.texts.heroSubtitle,
      DEFAULT_TEXTS.heroSubtitle,
      t.liveDefaults.heroSubtitle,
    ),
  };

  const items = live.items.map((item) => {
    const itemTr = item.translations?.[lang];
    if (!itemTr) return item;
    return {
      ...item,
      title: itemTr.title ?? item.title,
      description: itemTr.description ?? item.description,
      price_note: itemTr.price_note ?? item.price_note,
    };
  });

  return { ...live, business, texts, items };
}

const LiveContext = createContext<LiveSite>(DEFAULT_LIVE);

export function SiteLiveProvider({ value, children }: { value: LiveSite; children: ReactNode }) {
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

/** פורמט תאריך עברי לתצוגת "עודכן ב" (תאימות לאחור — קומפוננטות ניהול) */
export const formatUpdated = (iso: string | null | undefined) => {
  if (!iso) return DICTS.he.misc.noInfo;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return DICTS.he.misc.noInfo;
  return date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
};
