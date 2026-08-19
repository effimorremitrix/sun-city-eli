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

const title = 'מדיניות פרטיות | Privacy Policy — סאן סיטי נדל"ן';
const description =
  'מדיניות הפרטיות של סאן סיטי נדל"ן: איזה מידע נאסף, למי הוא נמסר, אינטגרציית פייסבוק ואינסטגרם, ואיך מוחקים מידע. Privacy policy of Sun City Real Estate, including our Meta (Facebook & Instagram) integration.';

export const Route = createFileRoute("/privacy")({
  validateSearch: validateLegalSearch,
  head: () => legalHead({ title, description, path: "/privacy" }),
  component: Page,
});

/** קישור טלפון/מייל — חוזר בשני הנוסחים, ולכן מרוכז כאן. */
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
      <p>
        מדיניות זו מסבירה איזה מידע אישי נאסף באתר {business.name}, למה הוא משמש, עם מי הוא משותף
        ואילו זכויות עומדות לכם. היא מנוסחת כך שתשקף במדויק את מה שהמערכת עושה בפועל.
      </p>

      <LegalH2>1. מי אנחנו ומיהו בעל השליטה במידע</LegalH2>
      <p>
        בעל השליטה במידע הוא {business.name}, {business.address}. רישיון תיווך מספר{" "}
        {business.license}. ליצירת קשר בכל עניין שקשור לפרטיות: <Contact />.
      </p>

      <LegalH2>2. בקצרה</LegalH2>
      <LegalList>
        <li>
          פרטים שאתם ממלאים בטפסי יצירת הקשר באתר נשלחים כהודעת וואטסאפ מהמכשיר שלכם — הם אינם
          נשמרים במסד הנתונים שלנו.
        </li>
        <li>מידע אישי כן נשמר כשאתם פותחים חשבון באזור האישי או מגדירים חיפוש שמור עם התראות.</li>
        <li>אין באתר Meta Pixel, Google Analytics, מנהל תגיות או כל מעקב פרסומי אחר.</li>
        <li>
          החיבור לפייסבוק ולאינסטגרם הוא כלי ניהול פנימי של מנהלי המשרד בלבד — הוא אינו Facebook
          Login לגולשים.
        </li>
        <li>איננו מוכרים מידע אישי ואיננו מוסרים אותו לצדדים שלישיים לצורכי שיווק שלהם.</li>
      </LegalList>

      <LegalH2>3. איזה מידע אנחנו אוספים</LegalH2>
      <p>
        <strong>מידע שאתם שולחים בטפסי האתר.</strong> שם, טלפון, נושא הפנייה וטקסט חופשי. לחיצה על
        שליחה פותחת את וואטסאפ במכשיר שלכם עם ההודעה מוכנה, ואתם ששולחים אותה אלינו. השדות האלה אינם
        עוברים דרך השרת שלנו ואינם נשמרים במסד הנתונים.
      </p>
      <p>
        <strong>חשבון משתמש.</strong> כתובת מייל ושם מלא (טבלת <code>profiles</code>), והרשאות
        החשבון (<code>user_roles</code>). האימות מתבצע ב-Supabase Auth.
      </p>
      <p>
        <strong>חיפושים שמורים והתראות.</strong> כשאתם מגדירים סוכן חיפוש אישי נשמרים קריטריוני
        החיפוש (עיר, שכונות, סוג עסקה, טווח מחיר וחדרים, ממ"ד, מעלית, חניה, מרפסת, הערות), העדפות
        ההתראה שלכם ומספר הוואטסאפ שמסרתם לצורך התראות (טבלאות <code>search_profiles</code> ו-
        <code>listing_notifications</code>).
      </p>
      <p>
        <strong>מידע של סוכנים ומנהלים.</strong> נתוני האתר והדפים האישיים, נכסים, תמונות ותרגומים,
        נכסים שנמכרו, מועמדים שאיתר סוכן הסריקה, וחיבורי פייסבוק ואינסטגרם.
      </p>
      <p>
        <strong>מדדי שימוש ב-AI.</strong> לכל פעולת AI נרשמים סוג הפעולה, שם המודל, מספר הטוקנים,
        העלות והסטטוס (<code>ai_usage_events</code>). תוכן הבקשה או התשובה עצמם אינם נשמרים ברישום
        הזה.
      </p>
      <p>
        <strong>מידע טכני.</strong> לוגים תפעוליים של השרת ושל ספקי התשתית, לצורך אבטחה ואיתור
        תקלות.
      </p>

      <LegalH2>4. למה אנחנו משתמשים במידע ומהו הבסיס החוקי</LegalH2>
      <LegalList>
        <li>
          <strong>מתן השירות וניהול החשבון</strong> — ביצוע החוזה מולכם.
        </li>
        <li>
          <strong>שליחת התראות על נכסים</strong> — הסכמה שנתתם, וניתן לבטלה בכל עת.
        </li>
        <li>
          <strong>מענה לפניות והתאמת נכסים</strong> — אינטרס לגיטימי ופעולות טרום-חוזיות לבקשתכם.
        </li>
        <li>
          <strong>אבטחת המערכת ומניעת ניצול לרעה</strong> — אינטרס לגיטימי.
        </li>
        <li>
          <strong>עמידה בחובות דין ותיעוד עסקאות</strong> — חובה חוקית.
        </li>
      </LegalList>
      <p>
        לגולשים תושבי האיחוד האירופי הבסיסים הם אלה שבסעיף 6 ל-GDPR. לכלל הגולשים חלים חוק הגנת
        הפרטיות, התשמ"א-1981 ותקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017.
      </p>

      <LegalH2>5. אינטגרציית Meta — פייסבוק ואינסטגרם</LegalH2>
      <p>
        <strong>
          זהו כלי פרסום עסקי שבו משתמשים אך ורק מנהלים מורשים של המשרד. זהו אינו Facebook Login
          לגולשי האתר.
        </strong>{" "}
        מבקרי האתר אינם מתבקשים להתחבר עם פייסבוק בשום שלב, ואיננו אוספים דרך Meta את{" "}
        <code>public_profile</code> או את כתובת המייל של אף גולש.
      </p>
      <p>
        מנהל מורשה מחבר את עמוד הפייסבוק העסקי של המשרד בתהליך OAuth של Meta. מה שנשמר אצלנו הוא
        מזהה העמוד, שם העמוד, מזהה חשבון האינסטגרם העסקי המקושר, וטוקן גישה ארוך-טווח לעמוד.{" "}
        <strong>הטוקן נקרא ונשלח אך ורק מצד השרת ולעולם אינו מועבר לדפדפן.</strong>
      </p>
      <p>ואלה ההרשאות שאנחנו מבקשים ומה עושים בכל אחת מהן:</p>
      <LegalList>
        <li>
          <code>pages_manage_posts</code> — פרסום פוסט על נכס לעמוד העסקי של המשרד, ביוזמת המנהל.
        </li>
        <li>
          <code>pages_read_engagement</code> — שליפת שם העמוד ומזההו כדי להציג למנהל לאיזה עמוד הוא
          מחובר.
        </li>
        <li>
          <code>instagram_basic</code> — זיהוי חשבון האינסטגרם העסקי המקושר לעמוד.
        </li>
        <li>
          <code>instagram_content_publish</code> — פרסום מקביל של אותו נכס לאינסטגרם העסקי.
        </li>
        <li>
          <code>ads_management</code> ו-<code>business_management</code> — הקמת קמפיין לקידום נכס.{" "}
          <strong>
            קמפיין נוצר תמיד במצב מושהה (PAUSED) ואינו עולה לאוויר בלי אישור ידני של המנהל במנהל
            המודעות של Meta.
          </strong>
        </li>
      </LegalList>
      <p>
        איננו מושכים ואיננו שומרים מידע אישי של עוקבים, מגיבים או לקוחות מפייסבוק או מאינסטגרם. אין
        באתר Meta Pixel, אין Conversions API, ואיננו בונים קהלים מותאמים ממבקרי האתר. השימוש שלנו
        במידע שמתקבל מ-Meta כפוף ל-Meta Platform Terms ולמדיניות המפתחים של Meta. להוראות ניתוק
        ומחיקה ראו{" "}
        <a href="/data-deletion" className="text-sun underline">
          עמוד מחיקת המידע
        </a>
        .
      </p>

      <LegalH2>6. עוגיות</LegalH2>
      <p>
        האתר משתמש רק בעוגיות ובאחסון מקומי הנחוצים לניהול סשן ההתחברות באזור האישי (Supabase Auth).
        אין באתר עוגיות אנליטיקה, פרסום או מעקב של צד שלישי.
      </p>

      <LegalH2>7. עם מי המידע משותף</LegalH2>
      <LegalList>
        <li>
          <strong>Supabase</strong> — מסד הנתונים, אחסון הקבצים ושירות האימות.
        </li>
        <li>
          <strong>Lovable</strong> — אחסון והרצה של האתר.
        </li>
        <li>
          <strong>Meta Platforms</strong> — פרסום לעמוד ולאינסטגרם ויצירת קמפיינים, ביוזמת מנהל
          בלבד.
        </li>
        <li>
          <strong>Green API</strong> — שליחת התראות וואטסאפ יוצאות.
        </li>
        <li>
          <strong>Resend</strong> — שליחת התראות במייל.
        </li>
        <li>
          <strong>Anthropic</strong> — שירותי ה-AI לתרגום תוכן, לחיפוש החכם ולסוכן הסריקה.
        </li>
        <li>
          <strong>Google Maps</strong> — מפה מוטמעת בעמודי הנכסים.
        </li>
        <li>
          <strong>OpenStreetMap</strong> — אריחי המפה והמרת כתובות לקואורדינטות.
        </li>
      </LegalList>
      <p>
        הספקים האלה מעבדים מידע עבורנו ולפי הוראותינו.{" "}
        <strong>איננו מוכרים מידע אישי ואיננו מוסרים אותו לצד שלישי לצורכי השיווק שלו.</strong> מידע
        יימסר לרשות מוסמכת רק כשהדין מחייב זאת.
      </p>

      <LegalH2>8. העברת מידע אל מחוץ לישראל</LegalH2>
      <p>
        חלק מהספקים שלעיל מפעילים שרתים מחוץ לישראל ומחוץ לאזור הכלכלי האירופי. העברות כאלה נעשות
        בהתאם למנגנוני ההגנה המקובלים, לרבות תניות חוזיות סטנדרטיות של האיחוד האירופי או החלטות
        נאותות, ככל שהן חלות.
      </p>

      <LegalH2>9. כמה זמן נשמר המידע</LegalH2>
      <LegalList>
        <li>מידע חשבון — כל עוד החשבון פעיל, ועד 12 חודשים לאחר בקשת סגירה.</li>
        <li>חיפושים שמורים והתראות — עד שתמחקו אותם או תסגרו את החשבון.</li>
        <li>חיבור פייסבוק ואינסטגרם — עד לניתוק על ידי המנהל, ואז נמחק מיידית.</li>
        <li>תיעוד שהדין מחייב לשמור — לפרק הזמן שנקבע בדין.</li>
      </LegalList>

      <LegalH2>10. אבטחת מידע</LegalH2>
      <p>
        המידע מוגן בהצפנת תעבורה (TLS), במדיניות הרשאות ברמת השורה (RLS) במסד הנתונים, בהפרדה בין
        קוד שרת לקוד דפדפן כך שסודות וטוקנים לעולם אינם נשלחים ללקוח, ובחתימת HMAC על פרמטר ה-state
        בתהליך ה-OAuth מול Meta. הגישה לאזור הניהול מוגבלת למשתמשים מורשים בלבד. אף מערכת אינה חסינה
        לחלוטין, ואנו פועלים לשיפור מתמיד.
      </p>

      <LegalH2>11. הזכויות שלכם</LegalH2>
      <p>
        עומדות לכם הזכויות לעיין במידע שעליכם, לתקן אותו, לבקש את מחיקתו, להתנגד לעיבוד או להגבילו,
        לקבל את המידע בפורמט נייד, ולחזור בכם מהסכמה שנתתם — בלי שהדבר יפגע בחוקיות העיבוד שנעשה
        קודם לכן.
      </p>
      <p>
        בישראל, זכות העיון והתיקון קבועה בסעיפים 13 ו-14 לחוק הגנת הפרטיות, התשמ"א-1981, וניתן להגיש
        תלונה לרשות להגנת הפרטיות. לתושבי האיחוד האירופי, הזכויות קבועות בסעיפים 15–22 ל-GDPR, וניתן
        להגיש תלונה לרשות הפיקוח המקומית.
      </p>
      <p>
        למימוש כל אחת מהזכויות פנו אלינו: <Contact />. נשיב תוך 30 יום לכל היותר.
      </p>

      <LegalH2>12. מחיקת מידע</LegalH2>
      <p>
        הוראות מלאות — כולל ניתוק חיבור פייסבוק ואינסטגרם — נמצאות בעמוד{" "}
        <a href="/data-deletion" className="text-sun underline">
          הוראות מחיקת מידע
        </a>
        .
      </p>

      <LegalH2>13. קטינים</LegalH2>
      <p>
        השירות אינו מיועד לקטינים מתחת לגיל 18 ואיננו אוספים ביודעין מידע עליהם. אם נודע לכם שקטין
        מסר לנו מידע, פנו אלינו והמידע יימחק.
      </p>

      <LegalH2>14. שינויים במדיניות</LegalH2>
      <p>
        נעדכן מדיניות זו מעת לעת. הנוסח המעודכן יפורסם כאן עם תאריך עדכון חדש; שינוי מהותי יובא
        לידיעת המשתמשים הרשומים.
      </p>

      <LegalH2>15. יצירת קשר</LegalH2>
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
      <p>
        This policy explains what personal information Sun City Real Estate ({business.name})
        collects, why we use it, who we share it with, and what rights you have. It is written to
        describe accurately what our system actually does.
      </p>

      <LegalH2>1. Who we are and who controls your data</LegalH2>
      <p>
        The data controller is Sun City Real Estate, {business.addressShort}, Israel. Real estate
        broker licence no. {business.license}. For any privacy matter, contact us at <Contact />.
      </p>

      <LegalH2>2. Summary at a glance</LegalH2>
      <LegalList>
        <li>
          Details you type into our contact forms are sent as a WhatsApp message from your own
          device — they are not stored in our database.
        </li>
        <li>
          Personal data is stored when you open an account or set up a saved search with alerts.
        </li>
        <li>
          There is no Meta Pixel, no Google Analytics, no tag manager, and no advertising tracking
          on this site.
        </li>
        <li>
          Our Facebook and Instagram connection is an internal tool for the agency's own
          administrators. It is not Facebook Login for site visitors.
        </li>
        <li>
          We do not sell personal data and we do not share it with third parties for their own
          marketing.
        </li>
      </LegalList>

      <LegalH2>3. What information we collect</LegalH2>
      <p>
        <strong>Information you send through site forms.</strong> Name, phone number, subject and
        free text. Pressing send opens WhatsApp on your device with the message prepared, and you
        send it to us. These fields do not pass through our server and are not stored in our
        database.
      </p>
      <p>
        <strong>Account data.</strong> Email address and full name (<code>profiles</code>
        table) and account permissions (<code>user_roles</code>). Authentication is handled by
        Supabase Auth.
      </p>
      <p>
        <strong>Saved searches and alerts.</strong> When you set up a personal search agent we store
        your search criteria (city, neighbourhoods, deal type, price and room ranges, safe room,
        lift, parking, balcony, notes), your alert preferences, and the WhatsApp number you provided
        for alerts (<code>search_profiles</code> and <code>listing_notifications</code>).
      </p>
      <p>
        <strong>Agent and administrator data.</strong> Site and personal-page settings, listings,
        images and translations, sold properties, candidates found by our listing-scout agent, and
        Facebook/Instagram connections.
      </p>
      <p>
        <strong>AI usage metering.</strong> For each AI operation we record the feature name, model,
        token counts, cost and status (<code>ai_usage_events</code>). The content of the prompt or
        the response is not stored in that record.
      </p>
      <p>
        <strong>Technical data.</strong> Operational server and infrastructure logs, used for
        security and troubleshooting.
      </p>

      <LegalH2>4. Purposes and legal basis</LegalH2>
      <LegalList>
        <li>
          <strong>Providing the service and managing your account</strong> — performance of our
          contract with you.
        </li>
        <li>
          <strong>Sending property alerts</strong> — your consent, which you may withdraw at any
          time.
        </li>
        <li>
          <strong>Answering enquiries and matching properties</strong> — legitimate interests and
          pre-contractual steps taken at your request.
        </li>
        <li>
          <strong>Securing the system and preventing abuse</strong> — legitimate interests.
        </li>
        <li>
          <strong>Meeting legal obligations and transaction record-keeping</strong> — legal
          obligation.
        </li>
      </LegalList>
      <p>
        For visitors resident in the European Union these are the bases set out in Article 6 GDPR.
        For all visitors, the Israeli Privacy Protection Law 5741-1981 and the Privacy Protection
        (Data Security) Regulations 5777-2017 apply.
      </p>

      <LegalH2>5. Meta (Facebook &amp; Instagram) integration</LegalH2>
      <p>
        <strong>
          This is a business publishing tool used only by the agency's own authorised
          administrators. It is not Facebook Login for site visitors.
        </strong>{" "}
        Visitors are never asked to sign in with Facebook, and we never collect any visitor's{" "}
        <code>public_profile</code> or email address through Meta.
      </p>
      <p>
        An authorised administrator connects the agency's own Facebook business Page through Meta's
        OAuth flow. What we store is the Page ID, the Page name, the ID of the linked Instagram
        business account, and a long-lived Page access token.{" "}
        <strong>
          That token is read and used exclusively server-side and is never sent to the browser.
        </strong>
      </p>
      <p>These are the permissions we request and exactly what we do with each:</p>
      <LegalList>
        <li>
          <code>pages_manage_posts</code> — publish a property post to the agency's own business
          Page, initiated by an administrator.
        </li>
        <li>
          <code>pages_read_engagement</code> — read the Page name and ID so we can show the
          administrator which Page is connected.
        </li>
        <li>
          <code>instagram_basic</code> — identify the Instagram business account linked to that
          Page.
        </li>
        <li>
          <code>instagram_content_publish</code> — publish the same property to the business
          Instagram account.
        </li>
        <li>
          <code>ads_management</code> and <code>business_management</code> — create an advertising
          campaign promoting a property.{" "}
          <strong>
            Campaigns are always created in PAUSED state and never go live without the administrator
            manually approving them in Meta Ads Manager.
          </strong>
        </li>
      </LegalList>
      <p>
        We do not retrieve or store personal data about followers, commenters or customers from
        Facebook or Instagram. There is no Meta Pixel, no Conversions API, and we build no custom
        audiences from site visitors. Our handling of data received from Meta complies with the Meta
        Platform Terms and Developer Policies. For disconnection and deletion instructions see our{" "}
        <a href="/data-deletion?lang=en" className="text-sun underline">
          data deletion page
        </a>
        .
      </p>

      <LegalH2>6. Cookies</LegalH2>
      <p>
        We use only the cookies and local storage strictly necessary to maintain your signed in
        session in the personal area (Supabase Auth). There are no analytics, advertising or
        third-party tracking cookies on this site.
      </p>

      <LegalH2>7. Service providers we share data with</LegalH2>
      <LegalList>
        <li>
          <strong>Supabase</strong> — database, file storage and authentication.
        </li>
        <li>
          <strong>Lovable</strong> — site hosting.
        </li>
        <li>
          <strong>Meta Platforms</strong> — Page and Instagram publishing and campaign creation,
          administrator-initiated only.
        </li>
        <li>
          <strong>Green API</strong> — outbound WhatsApp alerts.
        </li>
        <li>
          <strong>Resend</strong> — email alerts.
        </li>
        <li>
          <strong>Anthropic</strong> — AI services for content translation, smart search and the
          listing-scout agent.
        </li>
        <li>
          <strong>Google Maps</strong> — embedded map on property pages.
        </li>
        <li>
          <strong>OpenStreetMap</strong> — map tiles and address geocoding.
        </li>
      </LegalList>
      <p>
        These providers process data on our behalf and on our instructions.{" "}
        <strong>
          We do not sell personal data and we do not disclose it to any third party for their own
          marketing.
        </strong>{" "}
        We disclose data to a competent authority only where the law requires it.
      </p>

      <LegalH2>8. International data transfers</LegalH2>
      <p>
        Some of the providers listed above operate servers outside Israel and outside the European
        Economic Area. Such transfers rely on recognised safeguards, including the European
        Commission's Standard Contractual Clauses or adequacy decisions, where applicable.
      </p>

      <LegalH2>9. How long we keep data</LegalH2>
      <LegalList>
        <li>
          Account data — while the account is active, and up to 12 months after a closure request.
        </li>
        <li>Saved searches and alerts — until you delete them or close your account.</li>
        <li>
          Facebook and Instagram connections — until an administrator disconnects, at which point
          the record is deleted immediately.
        </li>
        <li>Records we are legally required to keep — for the period the law prescribes.</li>
      </LegalList>

      <LegalH2>10. Security</LegalH2>
      <p>
        Data is protected by TLS in transit, row level security policies in the database, a strict
        separation between server and browser code so that secrets and access tokens are never sent
        to the client, and an HMAC-signed state parameter in the Meta OAuth flow. Access to the
        admin area is limited to authorised users. No system is completely secure, and we keep
        improving ours.
      </p>

      <LegalH2>11. Your rights</LegalH2>
      <p>
        You have the right to access the data we hold about you, correct it, request its deletion,
        object to or restrict processing, receive it in a portable format, and withdraw consent you
        previously gave — without affecting the lawfulness of processing carried out beforehand.
      </p>
      <p>
        In Israel, the rights of access and correction are set out in sections 13 and 14 of the
        Privacy Protection Law 5741-1981, and you may lodge a complaint with the Israeli Privacy
        Protection Authority. For EU residents, the rights are set out in Articles 15 to 22 GDPR,
        and you may lodge a complaint with your local supervisory authority.
      </p>
      <p>
        To exercise any of these rights, contact us at <Contact />. We respond within 30 days at the
        latest.
      </p>

      <LegalH2>12. Deleting your data</LegalH2>
      <p>
        Full instructions — including how to disconnect a Facebook or Instagram connection — are on
        our{" "}
        <a href="/data-deletion?lang=en" className="text-sun underline">
          data deletion instructions page
        </a>
        .
      </p>

      <LegalH2>13. Children</LegalH2>
      <p>
        This service is not directed at anyone under 18 and we do not knowingly collect data about
        them. If you believe a minor has given us information, contact us and we will delete it.
      </p>

      <LegalH2>14. Changes to this policy</LegalH2>
      <p>
        We may update this policy from time to time. The updated version is published here with a
        new last-updated date, and registered users are notified of material changes.
      </p>

      <LegalH2>15. Contact us</LegalH2>
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
      path="/privacy"
      title={lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
      updated={UPDATED}
    >
      {lang === "he" ? <HeBody /> : <EnBody />}
    </LegalPage>
  );
}
