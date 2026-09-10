import { LOCALES, LOCALE_META, DICTS, type Locale } from "@/lib/i18n";
import { SITE_CONFIG, properties } from "@/lib/site-data";

/** הדומיין הקנוני של האתר בפרודקשן */
export const SITE_URL = "https://sun-city.company";

/**
 * תמונת התצוגה המקדימה (WhatsApp, פייסבוק, טוויטר) — כרטיס מיתוג 1200x630
 * עם לוגו סאן סיטי. הקובץ יושב ב-public/, ולכן הכתובת מוחלטת וקבועה.
 */
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
/** סמל הלוגו הריבועי — עבור schema.org/logo, שמצפה ללוגו ולא לכרטיס רחב */
export const LOGO_IMAGE = `${SITE_URL}/icon-512.png`;
export const OG_IMAGE_ALT = `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;

/** תגי og:image / twitter — מוגדרים פעם אחת ב-__root וחלים על כל דפי האתר */
export const ogImageMeta = [
  { name: "twitter:card", content: "summary_large_image" },
  { property: "og:image", content: OG_IMAGE },
  { property: "og:image:secure_url", content: OG_IMAGE },
  { property: "og:image:type", content: "image/png" },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: OG_IMAGE_ALT },
  { name: "twitter:image", content: OG_IMAGE },
  { name: "twitter:image:alt", content: OG_IMAGE_ALT },
];

const urlFor = (lang: Locale, slug?: string) =>
  slug
    ? `${SITE_URL}${lang === "he" ? "" : LOCALE_META[lang].path}/${slug}`
    : lang === "he"
      ? `${SITE_URL}/`
      : `${SITE_URL}${LOCALE_META[lang].path}`;

/** JSON-LD פר-שפה: פרטי הסוכנות + הנכסים הסטטיים */
const schemaFor = (lang: Locale, slug?: string) => {
  const t = DICTS[lang];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        name: SITE_CONFIG.name,
        alternateName: SITE_CONFIG.nameEn,
        telephone: SITE_CONFIG.phone,
        email: SITE_CONFIG.email,
        url: urlFor(lang, slug),
        logo: LOGO_IMAGE,
        image: OG_IMAGE,
        inLanguage: lang,
        areaServed: t.seo.areaServed,
        sameAs: [
          SITE_CONFIG.social.facebook,
          SITE_CONFIG.social.instagram,
          SITE_CONFIG.social.tiktok,
          SITE_CONFIG.madlanUrl,
        ],
        address: {
          "@type": "PostalAddress",
          streetAddress: "שמואל הנציב 20",
          addressLocality: t.seo.areaServed,
          addressCountry: "IL",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: SITE_CONFIG.reviewsRating,
          reviewCount: SITE_CONFIG.reviewsCount,
          bestRating: 5,
        },
      },
      ...properties.map((p) => ({
        "@type": "Residence",
        name: p.title,
        description: p.description,
        numberOfRooms: p.rooms,
        floorSize: { "@type": "QuantitativeValue", value: p.size, unitCode: "MTK" },
        address: {
          "@type": "PostalAddress",
          streetAddress: p.neighborhood,
          addressLocality: "נתניה",
          addressCountry: "IL",
        },
      })),
    ],
  };
};

/**
 * head מלא לעמוד הבית בשפה נתונה: title, description, canonical, hreflang ו-JSON-LD.
 * עם opts.slug כל הכתובות (canonical, hreflang, og:url, JSON-LD) מצביעות על
 * /<slug> במקום על שורש האתר — למצב שבו /sun-city הוא הכתובת הראשית.
 */
export function headForLocale(lang: Locale, opts: { slug?: string } = {}) {
  const t = DICTS[lang];
  const canonical = urlFor(lang, opts.slug);

  return {
    meta: [
      { title: t.seo.title },
      { name: "description", content: t.seo.description },
      { property: "og:site_name", content: SITE_CONFIG.name },
      { property: "og:title", content: t.seo.title },
      { property: "og:description", content: t.seo.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: LOCALE_META[lang].og },
      ...LOCALES.filter((l) => l !== lang).map((l) => ({
        property: "og:locale:alternate",
        content: LOCALE_META[l].og,
      })),
    ],
    links: [
      { rel: "canonical", href: canonical },
      ...LOCALES.map((l) => ({ rel: "alternate", hrefLang: l, href: urlFor(l, opts.slug) })),
      {
        rel: "alternate",
        hrefLang: "x-default",
        href: opts.slug ? `${SITE_URL}/${opts.slug}` : `${SITE_URL}/`,
      },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(schemaFor(lang, opts.slug)) },
    ],
  };
}
