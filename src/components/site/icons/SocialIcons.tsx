import { useId, type SVGProps } from "react";
import { useLive } from "@/lib/site-live";
import { useLang } from "@/lib/i18n";
import { buildWa } from "@/lib/site-data";

/**
 * אייקוני מותג צבעוניים לרשתות החברתיות — מוצגים בראש העמוד.
 * הקישורים נלקחים מ-business.social, כך שבדף אישי של סוכן מוצגים הקישורים שלו.
 */

export function FacebookBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.67 15.47l.53-3.47h-3.33V9.75c0-.95.46-1.88 1.96-1.88h1.51V4.92s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.05V24a12.1 12.1 0 0 0 3.75 0v-8.53h2.79z"
      />
    </svg>
  );
}

export function InstagramBrandIcon(props: SVGProps<SVGSVGElement>) {
  /* מזהה ייחודי לכל מופע: id קבוע גורם לכל האייקונים בעמוד להפנות לגרדיאנט
     הראשון ב-DOM, וכשהוא בתוך אלמנט מוסתר (התפריט בדסקטופ/מובייל) — האייקון
     נצבע שקוף. */
  const gradId = useId();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <defs>
        <radialGradient id={gradId} cx="0.3" cy="1.1" r="1.3">
          <stop offset="0" stopColor="#FED576" />
          <stop offset="0.26" stopColor="#F47133" />
          <stop offset="0.61" stopColor="#BC3081" />
          <stop offset="1" stopColor="#4C63D2" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradId})`} />
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16.7" cy="7.3" r="1.15" fill="#fff" />
    </svg>
  );
}

export function TikTokBrandIcon(props: SVGProps<SVGSVGElement>) {
  const note =
    "M15.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2H8.37v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 1 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <rect width="24" height="24" rx="6" fill="#010101" />
      <g transform="translate(3.7 1.2) scale(0.82)">
        <path d={note} fill="#25F4EE" transform="translate(-0.85 -0.85)" />
        <path d={note} fill="#FE2C55" transform="translate(0.85 0.85)" />
        <path d={note} fill="#fff" />
      </g>
    </svg>
  );
}

/** אייקון מקורי לקבוצת הקונים: בית ירוק-וואטסאפ עם דמויות הקונים מתחת לגג */
export function BuyersGroupBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <rect width="24" height="24" rx="6" fill="#25D366" />
      {/* גג הבית */}
      <path
        d="M4.6 11.2L12 5l7.4 6.2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* קירות הבית */}
      <path
        d="M6.4 10.6V19h11.2v-8.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* הקונים: שלוש דמויות בתוך הבית */}
      <circle cx="9" cy="13.4" r="1.25" fill="#fff" />
      <circle cx="15" cy="13.4" r="1.25" fill="#fff" />
      <circle cx="12" cy="12.6" r="1.45" fill="#fff" />
      <path d="M6.9 19c.35-1.7 1.05-2.55 2.1-2.55S10.75 17.3 11 19z" fill="#fff" />
      <path d="M13 19c.25-1.7.95-2.55 2-2.55s1.75.85 2.1 2.55z" fill="#fff" />
      <path d="M9.6 19c.3-2 1.1-3 2.4-3s2.1 1 2.4 3z" fill="#fff" />
    </svg>
  );
}

/** שורת קישורי הרשתות של הדף הנוכחי (רק קישורים שמולאו) */
export function SocialLinks({
  size = "size-7",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  const { business } = useLive();
  const { t } = useLang();
  const social = business.social ?? { facebook: "", instagram: "", tiktok: "", whatsappGroup: "" };

  /* קבוצת הקונים מוצגת תמיד: קבוצה שהוזנה באזור האישי, ואם אין —
   * הוואטסאפ האישי של סוכן הדף (בדף הראשי — של המשרד). */
  const groupHref =
    social.whatsappGroup?.trim() || buildWa(t.footer.whatsappGroupJoinMsg, business.phoneTel);

  const links = [
    { href: social.facebook, label: t.footer.facebookAria, Icon: FacebookBrandIcon },
    { href: social.instagram, label: t.footer.instagramAria, Icon: InstagramBrandIcon },
    { href: social.tiktok, label: "TikTok", Icon: TikTokBrandIcon },
  ].filter((l) => Boolean(l.href?.trim()));
  links.push({ href: groupHref, label: t.footer.whatsappGroupAria, Icon: BuyersGroupBrandIcon });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="transition-transform hover:-translate-y-0.5"
        >
          <Icon className={size} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
