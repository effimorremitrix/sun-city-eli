import { LOCALES, LOCALE_META, DICTS, type Locale } from "@/lib/i18n";
import { SITE_CONFIG, properties } from "@/lib/site-data";

/** הדומיין הקנוני של האתר בפרודקשן */
export const SITE_URL = "https://sun-city.company";

const urlFor = (lang: Locale) =>
  lang === "he" ? `${SITE_URL}/` : `${SITE_URL}${LOCALE_META[lang].path}`;

/** JSON-LD פר-שפה: פרטי הסוכנות + הנכסים הסטטיים */
const schemaFor = (lang: Locale) => {
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
        url: urlFor(lang),
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

/** head מלא לעמוד הבית בשפה נתונה: title, description, canonical, hreflang ו-JSON-LD */
export function headForLocale(lang: Locale) {
  const t = DICTS[lang];
  const canonical = urlFor(lang);

  return {
    meta: [
      { title: t.seo.title },
      { name: "description", content: t.seo.description },
      { property: "og:title", content: t.seo.title },
      { property: "og:description", content: t.seo.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: LOCALE_META[lang].og },
      ...LOCALES.filter((l) => l !== lang).map((l) => ({
        property: "og:locale:alternate",
        content: LOCALE_META[l].og,
      })),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: canonical },
      ...LOCALES.map((l) => ({ rel: "alternate", hrefLang: l, href: urlFor(l) })),
      { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/` },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(schemaFor(lang)) }],
  };
}
