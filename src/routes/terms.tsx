import { createFileRoute } from "@tanstack/react-router";
import { business } from "@/lib/site-data";
import {
  LegalH2,
  LegalList,
  LegalPage,
  legalHead,
  legalLang,
  validateLegalSearch,
} from "@/components/site/LegalPage";

const UPDATED = "2026-08-19";

const title = 'תנאי שימוש | Terms of Service — סאן סיטי נדל"ן';
const description =
  'תנאי השימוש באתר סאן סיטי נדל"ן: השירות, חשבונות משתמש, מידע על נכסים, דמי תיווך, אחריות ודין חל. Terms of service for the Sun City Real Estate website.';

export const Route = createFileRoute("/terms")({
  validateSearch: validateLegalSearch,
  head: () => legalHead({ title, description, path: "/terms" }),
  component: Page,
});

function Contact() {
  return (
    <>
      <a href={`tel:${business.phoneTel}`} className="underline">
        {business.phone}
      </a>{" "}
      ·{" "}
      <a href={`mailto:${business.email}`} className="underline">
        {business.email}
      </a>
    </>
  );
}

/* ============================ עברית ============================ */

function HeBody() {
  return (
    <>
      <LegalH2>1. כללי וקבלת התנאים</LegalH2>
      <p>
        תנאים אלה חלים על השימוש באתר {business.name} ובכל השירותים שבו. עצם הגלישה באתר, פתיחת
        חשבון או פנייה דרך הטפסים מהווים הסכמה לתנאים. מי שאינו מסכים להם מתבקש שלא לעשות שימוש
        באתר.
      </p>

      <LegalH2>2. השירות שאנחנו מספקים</LegalH2>
      <p>
        האתר הוא אתר תדמית ורישום נכסים של משרד תיווך מורשה בנתניה, רישיון תיווך מספר{" "}
        {business.license}. באתר מוצגים נכסים למכירה ולהשכרה, מידע על המשרד ועל הצוות, וכלים ליצירת
        קשר ולקבלת התראות על נכסים חדשים.
      </p>

      <LegalH2>3. חשבון משתמש</LegalH2>
      <p>
        חלק מהשירותים מחייבים פתיחת חשבון. עליכם למסור פרטים נכונים ומעודכנים, לשמור על סודיות פרטי
        ההתחברות ולהודיע לנו על כל שימוש לא מורשה. אנו רשאים להשעות או לסגור חשבון שנעשה בו שימוש
        בניגוד לתנאים אלה או לדין.
      </p>

      <LegalH2>4. התראות ותקשורת</LegalH2>
      <p>
        התראות במייל ובוואטסאפ נשלחות רק לפי הגדרות החיפוש השמור שבחרתם. אפשר לכבות אותן או למחוק
        חיפוש שמור בכל עת באזור האישי, וכן בפנייה אלינו.
      </p>

      <LegalH2>5. שימוש מותר ואסור</LegalH2>
      <LegalList>
        <li>אין לבצע סריקה אוטומטית (scraping), הורדה המונית או שכפול של תוכן האתר.</li>
        <li>אין לעשות שימוש מסחרי בתמונות הנכסים או בתוכן האתר בלי אישור בכתב.</li>
        <li>אין לנסות לחדור למערכת, לעקוף הרשאות או לשבש את פעילות השירות.</li>
        <li>אין להעלות או לשלוח תוכן בלתי חוקי, מטעה או פוגעני.</li>
      </LegalList>

      <LegalH2>6. תוכן וקניין רוחני</LegalH2>
      <p>
        כל הזכויות בתוכן האתר, בעיצובו, בסימני המסחר ובתמונות הנכסים שמורות ל{business.name} או
        לבעלי הזכויות מטעמו. תוכן שאתם מוסרים לנו (למשל תמונות נכס) נשאר שלכם, ואתם מעניקים לנו
        רישיון לא בלעדי להשתמש בו לצורך הצגת הנכס ושיווקו.
      </p>

      <LegalH2>7. מידע על נכסים — אינו הצעה מחייבת</LegalH2>
      <p>
        פרטי הנכסים, המחירים והזמינות עשויים להשתנות בלי הודעה מוקדמת, ואינם מהווים הצעה מחייבת.
        הנתונים באתר אינם תחליף לבדיקה עצמאית, לייעוץ משפטי, מיסויי או פיננסי, ואין להסתמך עליהם
        לצורך קבלת החלטה בעסקה.
      </p>

      <LegalH2>8. דמי תיווך מחייבים הסכם בכתב</LegalH2>
      <p>
        בהתאם לחוק המתווכים במקרקעין, התשנ"ו-1996, זכאות לדמי תיווך קמה רק על יסוד הזמנה בכתב חתומה
        כדין. השימוש באתר, לרבות פנייה בטופס או בוואטסאפ, אינו יוצר כשלעצמו התקשרות בתיווך ואינו
        מקים חבות בדמי תיווך.
      </p>

      <LegalH2>9. שירותים וקישורים של צד שלישי</LegalH2>
      <p>
        באתר מוטמעים ומקושרים שירותים של צדדים שלישיים — בהם מפות, וואטסאפ ופלטפורמות Meta. השימוש
        בהם כפוף לתנאים ולמדיניות הפרטיות של אותם ספקים, ואיננו אחראים לתוכן או לזמינות של אתרים
        חיצוניים.
      </p>

      <LegalH2>10. תוכן שנוצר בסיוע בינה מלאכותית</LegalH2>
      <p>
        תרגומי תוכן, תיאורי נכסים ונוסחי פוסטים עשויים להיווצר בסיוע כלי AI ועלולים להכיל אי-דיוקים.
        בכל מקרה של סתירה, הנוסח העברי המקורי הוא הקובע.
      </p>

      <LegalH2>11. אינטגרציית Meta לפרסום</LegalH2>
      <p>
        הפרסום לפייסבוק ולאינסטגרם מתבצע על ידי מנהלי המשרד בלבד, מהעמודים העסקיים שלהם. מנהל שמחבר
        עמוד מתחייב לפעול בהתאם ל-Meta Platform Terms, למדיניות הפרסום ולכללי הקהילה של Meta, ולוודא
        שיש לו את הזכויות בתוכן שהוא מפרסם.
      </p>

      <LegalH2>12. פרטיות ונגישות</LegalH2>
      <p>
        אופן הטיפול במידע אישי מפורט ב
        <a href="/privacy" className="text-sun underline">
          מדיניות הפרטיות
        </a>
        , והצהרת הנגישות של האתר נמצאת ב
        <a href="/accessibility" className="text-sun underline">
          עמוד הנגישות
        </a>
        .
      </p>

      <LegalH2>13. הגבלת אחריות</LegalH2>
      <p>
        השירות ניתן כמות שהוא (AS IS). איננו מתחייבים לזמינות רציפה, לדיוק מלא של הנתונים או להיעדר
        תקלות. בכפוף לדין, לא נישא באחריות לנזק עקיף, תוצאתי או אובדן רווח שנגרם משימוש באתר או
        מהסתמכות על תוכנו.
      </p>

      <LegalH2>14. שיפוי</LegalH2>
      <p>
        משתמש שיפר תנאים אלה או את הדין ישפה אותנו בגין כל נזק, הוצאה או תביעה שייגרמו לנו כתוצאה
        מכך.
      </p>

      <LegalH2>15. שינויים בתנאים</LegalH2>
      <p>
        נעדכן תנאים אלה מעת לעת. הנוסח המעודכן יפורסם כאן עם תאריך עדכון חדש, והמשך השימוש באתר לאחר
        פרסומו מהווה הסכמה לו.
      </p>

      <LegalH2>16. דין חל וסמכות שיפוט</LegalH2>
      <p>
        על תנאים אלה חלים דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים
        במחוז תל אביב.
      </p>

      <LegalH2>17. יצירת קשר</LegalH2>
      <p>
        {business.name}, {business.address}. <Contact />. רישיון תיווך {business.license}.
      </p>
    </>
  );
}

/* ============================ English ============================ */

function EnBody() {
  return (
    <>
      <LegalH2>1. About these terms and your acceptance</LegalH2>
      <p>
        These terms govern your use of the Sun City Real Estate website and all services on it. By
        browsing the site, opening an account or contacting us through its forms you accept these
        terms. If you do not accept them, please do not use the site.
      </p>

      <LegalH2>2. The service we provide</LegalH2>
      <p>
        This is the informational and listings website of a licensed real estate brokerage in
        Netanya, Israel, broker licence no. {business.license}. It presents properties for sale and
        rent, information about the office and its team, and tools for contacting us and receiving
        alerts about new listings.
      </p>

      <LegalH2>3. User accounts</LegalH2>
      <p>
        Some features require an account. You must provide accurate and current details, keep your
        credentials confidential, and tell us about any unauthorised use. We may suspend or close an
        account used in breach of these terms or of the law.
      </p>

      <LegalH2>4. Notifications and communications</LegalH2>
      <p>
        Email and WhatsApp alerts are sent only according to the saved search settings you chose.
        You can turn them off or delete a saved search at any time in your personal area, or by
        contacting us.
      </p>

      <LegalH2>5. Acceptable use</LegalH2>
      <LegalList>
        <li>No automated scraping, bulk downloading or reproduction of site content.</li>
        <li>
          No commercial use of property photographs or site content without our written permission.
        </li>
        <li>No attempts to breach the system, bypass permissions or disrupt the service.</li>
        <li>No uploading or sending of unlawful, misleading or offensive content.</li>
      </LegalList>

      <LegalH2>6. Content and intellectual property</LegalH2>
      <p>
        All rights in the site's content, design, trade marks and property photographs belong to Sun
        City Real Estate or to its licensors. Content you provide to us — a property photograph, for
        example — remains yours, and you grant us a non-exclusive licence to use it in order to
        present and market that property.
      </p>

      <LegalH2>7. Property information is not a binding offer</LegalH2>
      <p>
        Property details, prices and availability may change without notice and do not constitute a
        binding offer. Nothing on this site substitutes for your own due diligence or for legal, tax
        or financial advice, and it should not be relied upon in making a transaction decision.
      </p>

      <LegalH2>8. Brokerage fees require a signed written agreement</LegalH2>
      <p>
        Under the Israeli Real Estate Brokers Law 5756-1996, entitlement to brokerage fees arises
        only on the basis of a duly signed written engagement. Using this site, including sending a
        form or a WhatsApp message, does not by itself create a brokerage engagement or any
        liability for fees.
      </p>

      <LegalH2>9. Third-party services and links</LegalH2>
      <p>
        The site embeds and links to third-party services, including maps, WhatsApp and Meta
        platforms. Your use of those is governed by their own terms and privacy policies, and we are
        not responsible for the content or availability of external sites.
      </p>

      <LegalH2>10. AI-assisted content</LegalH2>
      <p>
        Content translations, property descriptions and social post copy may be generated with the
        help of AI tools and may contain inaccuracies. In any conflict, the original Hebrew version
        governs.
      </p>

      <LegalH2>11. Meta publishing integration</LegalH2>
      <p>
        Publishing to Facebook and Instagram is performed only by the agency's own administrators,
        from their own business accounts. An administrator who connects a Page undertakes to comply
        with the Meta Platform Terms, Advertising Policies and Community Standards, and to hold the
        rights in the content they publish.
      </p>

      <LegalH2>12. Privacy and accessibility</LegalH2>
      <p>
        How we handle personal data is set out in our{" "}
        <a href="/privacy?lang=en" className="text-sun underline">
          privacy policy
        </a>
        , and the site's accessibility statement is on the{" "}
        <a href="/accessibility" className="text-sun underline">
          accessibility page
        </a>
        .
      </p>

      <LegalH2>13. Disclaimers and limitation of liability</LegalH2>
      <p>
        The service is provided "as is". We do not warrant uninterrupted availability, complete
        accuracy of the data, or freedom from faults. Subject to applicable law, we are not liable
        for indirect or consequential loss, or loss of profit, arising from use of the site or
        reliance on its content.
      </p>

      <LegalH2>14. Indemnity</LegalH2>
      <p>
        A user who breaches these terms or the law shall indemnify us against any damage, expense or
        claim we incur as a result.
      </p>

      <LegalH2>15. Changes to these terms</LegalH2>
      <p>
        We may update these terms from time to time. The updated version is published here with a
        new last-updated date, and continued use of the site after publication constitutes
        acceptance.
      </p>

      <LegalH2>16. Governing law and jurisdiction</LegalH2>
      <p>
        These terms are governed exclusively by the laws of the State of Israel. The competent
        courts of the Tel Aviv District have exclusive jurisdiction.
      </p>

      <LegalH2>17. Contact</LegalH2>
      <p>
        Sun City Real Estate, {business.addressShort}, Israel. <Contact />. Broker licence{" "}
        {business.license}.
      </p>
    </>
  );
}

function Page() {
  const lang = legalLang(Route.useSearch());

  return (
    <LegalPage
      lang={lang}
      path="/terms"
      title={lang === "he" ? "תנאי שימוש" : "Terms of Service"}
      updated={UPDATED}
    >
      {lang === "he" ? <HeBody /> : <EnBody />}
    </LegalPage>
  );
}
