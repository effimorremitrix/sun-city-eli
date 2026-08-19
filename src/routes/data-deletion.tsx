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

const title = 'הוראות מחיקת מידע | Data Deletion Instructions — סאן סיטי נדל"ן';
const description =
  'איך למחוק מידע אישי אצל סאן סיטי נדל"ן ואיך לנתק חיבור פייסבוק או אינסטגרם. Data deletion instructions for Sun City Real Estate, including how to disconnect a Facebook or Instagram connection.';

export const Route = createFileRoute("/data-deletion")({
  validateSearch: validateLegalSearch,
  head: () => legalHead({ title, description, path: "/data-deletion" }),
  component: Page,
});

/* ============================ עברית ============================ */

function HeBody() {
  return (
    <>
      <p>
        זהו עמוד הוראות מחיקת המידע (Data Deletion Instructions) של {business.name}, והוא הכתובת
        שאליה מפנות הגדרות אפליקציית ה-Meta שלנו. בעמוד מוסבר איך למחוק מידע אישי ואיך לנתק חיבור
        לפייסבוק או לאינסטגרם.
      </p>

      <LegalH2>אפשרות א' — מחיקה עצמית באזור האישי</LegalH2>
      <p>
        אם יש לכם חשבון באתר, אפשר להתחבר ולנהל את המידע בעצמכם ב
        <a href="/account" className="text-sun underline">
          אזור האישי
        </a>
        :
      </p>
      <LegalList>
        <li>מחיקת חיפוש שמור — מוחקת את קריטריוני החיפוש ואת ההתראות שנשלחו עבורו.</li>
        <li>כיבוי התראות מייל או וואטסאפ, והסרת מספר הוואטסאפ שמסרתם.</li>
        <li>עדכון או תיקון פרטי החשבון.</li>
      </LegalList>

      <LegalH2>אפשרות ב' — בקשה למחיקת החשבון וכל המידע</LegalH2>
      <p>למחיקה מלאה שלחו אלינו בקשה באחת מהדרכים הבאות, עם הכותרת "בקשת מחיקת מידע":</p>
      <LegalList>
        <li>
          מייל:{" "}
          <a
            href={`mailto:${business.email}?subject=${encodeURIComponent("בקשת מחיקת מידע")}`}
            className="underline"
          >
            {business.email}
          </a>
        </li>
        <li>
          טלפון או וואטסאפ:{" "}
          <a href={`tel:${business.phoneTel}`} className="underline">
            {business.phone}
          </a>
        </li>
        <li>דואר: {business.address}</li>
      </LegalList>
      <p>
        ציינו בבקשה את כתובת המייל שאיתה נרשמתם, ואם קיבלתם התראות בוואטסאפ — גם את מספר הטלפון.
        ייתכן שנבקש פרט מזהה נוסף כדי לוודא שהבקשה אכן שלכם, וזאת כדי להגן עליכם. נאשר את הביצוע
        בכתב.
      </p>

      <LegalH2>מנהלי אתר — ניתוק חיבור פייסבוק ואינסטגרם</LegalH2>
      <p>
        החיבור לפייסבוק ולאינסטגרם קיים רק אצל מנהלי המשרד, לצורך פרסום נכסים. לניתוק ולמחיקת
        החיבור:
      </p>
      <LegalList>
        <li>
          נכנסים ללוח הניהול (<code>/admin</code>) ← לשונית הפרסום ← לוחצים על{" "}
          <strong>ניתוק</strong>. הפעולה מוחקת מיידית ולצמיתות את רשומת החיבור, לרבות טוקן הגישה
          לעמוד, מזהה העמוד ומזהה חשבון האינסטגרם.
        </li>
        <li>
          לביטול נוסף מצד Meta: בפייסבוק ← Settings &amp; Privacy ← Settings ← Business Integrations
          ← בוחרים את האפליקציה ← Remove. באינסטגרם: Apps and Websites.
        </li>
      </LegalList>
      <p>
        שימו לב: ניתוק החיבור אינו מוחק פוסטים שכבר פורסמו לעמוד או לאינסטגרם שלכם. את אלה יש למחוק
        בכלים של Meta.
      </p>

      <LegalH2>מה נמחק ומה נשמר</LegalH2>
      <p>
        <strong>נמחק:</strong> פרטי החשבון, ההרשאות, החיפושים השמורים, ההתראות, מספר הוואטסאפ
        להתראות, וחיבורי פייסבוק ואינסטגרם על הטוקנים שבהם.
      </p>
      <p>
        <strong>נשמר:</strong> תיעוד שהדין מחייב לשמור (למשל תיעוד חשבונאי ותיעוד עסקאות תיווך), וכן
        מוני שימוש מצטברים שאינם מזהים אתכם לאחר ניתוקם מהחשבון.
      </p>

      <LegalH2>כמה זמן זה לוקח</LegalH2>
      <p>
        ניתוק חיבור פייסבוק או אינסטגרם ומחיקת חיפוש שמור מתבצעים מיידית. בקשת מחיקה מלאה מטופלת
        בדרך כלל תוך 14 ימים, ולא יאוחר מ-30 יום מקבלת הבקשה.
      </p>

      <LegalH2>שאלות</LegalH2>
      <p>
        {business.name}, {business.address}.{" "}
        <a href={`tel:${business.phoneTel}`} className="underline">
          {business.phone}
        </a>{" "}
        ·{" "}
        <a href={`mailto:${business.email}`} className="underline">
          {business.email}
        </a>
        . פרטים נוספים ב
        <a href="/privacy" className="text-sun underline">
          מדיניות הפרטיות
        </a>
        .
      </p>
    </>
  );
}

/* ============================ English ============================ */

function EnBody() {
  return (
    <>
      <p>
        These are the data deletion instructions for Sun City Real Estate, and this is the URL
        referenced from our Meta app settings. This page explains how to delete personal data and
        how to disconnect a Facebook or Instagram connection.
      </p>

      <LegalH2>Option A — delete it yourself</LegalH2>
      <p>
        If you have an account on the site, sign in and manage your data yourself in the{" "}
        <a href="/account" className="text-sun underline">
          personal area
        </a>
        :
      </p>
      <LegalList>
        <li>
          Delete a saved search — this removes the search criteria and the alerts stored for it.
        </li>
        <li>Turn off email or WhatsApp alerts, and remove the WhatsApp number you gave us.</li>
        <li>Update or correct your account details.</li>
      </LegalList>

      <LegalH2>Option B — request deletion of your account and all your data</LegalH2>
      <p>
        For full deletion, send us a request by one of the following, using the subject line "Data
        deletion request":
      </p>
      <LegalList>
        <li>
          Email:{" "}
          <a
            href={`mailto:${business.email}?subject=${encodeURIComponent("Data deletion request")}`}
            className="underline"
          >
            {business.email}
          </a>
        </li>
        <li>
          Phone or WhatsApp:{" "}
          <a href={`tel:${business.phoneTel}`} className="underline">
            +972 52-555-1200
          </a>
        </li>
        <li>Post: {business.addressShort}, Israel</li>
      </LegalList>
      <p>
        Please include the email address you registered with, and — if you received WhatsApp alerts
        — that phone number too. We may ask for one further identifying detail to confirm the
        request is genuinely yours, which protects you. We confirm completion in writing.
      </p>

      <LegalH2>Site administrators — disconnecting Facebook and Instagram</LegalH2>
      <p>
        A Facebook or Instagram connection exists only for the agency's own administrators, for
        publishing property listings. To disconnect and delete it:
      </p>
      <LegalList>
        <li>
          Go to the admin panel (<code>/admin</code>) → the publishing tab → press{" "}
          <strong>ניתוק</strong> (Disconnect). This immediately and permanently deletes the stored
          connection record, including the Page access token, the Page ID and the Instagram account
          ID.
        </li>
        <li>
          To revoke from Meta's side as well: on Facebook go to Settings &amp; Privacy → Settings →
          Business Integrations → select the app → Remove. On Instagram: Apps and Websites.
        </li>
      </LegalList>
      <p>
        Note that disconnecting does not delete posts already published to your own Page or
        Instagram account. Those must be deleted using Meta's own tools.
      </p>

      <LegalH2>What is deleted and what we must retain</LegalH2>
      <p>
        <strong>Deleted:</strong> your account details and permissions, saved searches,
        notifications, the WhatsApp number used for alerts, and any Facebook or Instagram connection
        together with its tokens.
      </p>
      <p>
        <strong>Retained:</strong> records we are legally required to keep, such as accounting
        records and brokerage transaction records, and aggregate usage counters that no longer
        identify you once detached from the account.
      </p>

      <LegalH2>How long it takes</LegalH2>
      <p>
        Disconnecting a Facebook or Instagram connection and deleting a saved search take effect
        immediately. A full deletion request is normally completed within 14 days, and no later than
        30 days from receipt.
      </p>

      <LegalH2>Questions</LegalH2>
      <p>
        Sun City Real Estate, {business.addressShort}, Israel.{" "}
        <a href={`tel:${business.phoneTel}`} className="underline">
          +972 52-555-1200
        </a>{" "}
        ·{" "}
        <a href={`mailto:${business.email}`} className="underline">
          {business.email}
        </a>
        . Further detail is in our{" "}
        <a href="/privacy?lang=en" className="text-sun underline">
          privacy policy
        </a>
        .
      </p>
    </>
  );
}

function Page() {
  const lang = legalLang(Route.useSearch());

  return (
    <LegalPage
      lang={lang}
      path="/data-deletion"
      title={lang === "he" ? "הוראות מחיקת מידע" : "Data Deletion Instructions"}
      updated={UPDATED}
    >
      {lang === "he" ? <HeBody /> : <EnBody />}
    </LegalPage>
  );
}
