import { createContext, useContext, type ReactNode } from "react";
import { SITE_CONFIG } from "@/lib/site-data";

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
};

export type LiveTexts = {
  heroTitle: string;
  heroSubtitle: string;
};

export type LiveItem = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  price: number | null;
  price_note: string | null;
  image_url: string | null;
};

export type LiveSite = {
  business: LiveBusiness;
  texts: LiveTexts;
  items: LiveItem[];
  /** תאריך העדכון האחרון של התוכן במסד הנתונים (ISO) — null כשאין רשומה */
  updatedAt: string | null;
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
};

export const DEFAULT_LIVE: LiveSite = {
  business: DEFAULT_BUSINESS,
  texts: DEFAULT_TEXTS,
  items: [],
  updatedAt: null,
};

/** ממזג נתונים חלקיים מבסיס הנתונים עם ברירות המחדל */
export function mergeLive(raw: unknown): LiveSite {
  const data = (raw ?? {}) as {
    business?: Partial<LiveBusiness>;
    texts?: Partial<LiveTexts>;
    items?: LiveItem[];
    updated_at?: string | null;
  };
  const business = { ...DEFAULT_BUSINESS, ...(data.business ?? {}) };
  if (!Array.isArray(business.hours) || business.hours.length === 0) {
    business.hours = DEFAULT_BUSINESS.hours;
  }
  return {
    business,
    texts: { ...DEFAULT_TEXTS, ...(data.texts ?? {}) },
    items: Array.isArray(data.items) ? data.items : [],
    updatedAt: data.updated_at ?? null,
  };
}

const LiveContext = createContext<LiveSite>(DEFAULT_LIVE);

export function SiteLiveProvider({ value, children }: { value: LiveSite; children: ReactNode }) {
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

/** פורמט תאריך עברי לתצוגת "עודכן ב" */
export const formatUpdated = (iso: string | null | undefined) => {
  if (!iso) return "אין מידע";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "אין מידע";
  return date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
};
