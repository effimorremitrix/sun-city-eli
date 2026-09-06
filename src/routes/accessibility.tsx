import { createFileRoute, Link } from "@tanstack/react-router";
import { business } from "@/lib/site-data";

const title = 'הצהרת נגישות | סאן סיטי נדל"ן נתניה';
const description =
  'הצהרת הנגישות של אתר סאן סיטי נדל"ן בנתניה, בהתאם לתקן הישראלי 5568 ולתקנות שוויון זכויות לאנשים עם מוגבלות.';

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <Link to="/" className="text-sm font-bold text-sun underline">
        חזרה לעמוד הבית
      </Link>
      <h1 className="mt-4 text-3xl">הצהרת נגישות</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-foreground">
        <p>
          אנו ב{business.name} רואים חשיבות רבה במתן שירות שוויוני לכלל הגולשים, ופועלים להנגשת האתר
          בהתאם לתקן הישראלי 5568 ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות),
          תשע"ג-2013, ברמת AA.
        </p>
        <h2 className="text-xl">התאמות שבוצעו באתר</h2>
        <ul className="list-disc space-y-1.5 pe-6">
          <li>תמיכה מלאה בכיווניות עברית (RTL) וטיפוגרפיה גדולה וברורה.</li>
          <li>ניווט מלא באמצעות מקלדת וסימון מיקוד ברור.</li>
          <li>ניגודיות צבעים בהתאם לרמת AA ומצב ניגודיות גבוהה.</li>
          <li>כפתור נגישות צף להגדלת טקסט ולהחלפת ניגודיות.</li>
          <li>תיאורי תמונה (alt) בעברית וכיתובים לשדות הטפסים.</li>
          <li>שימוש בתגיות סמנטיות ובתוויות aria בעברית.</li>
        </ul>
        <h2 className="text-xl">הסתייגויות</h2>
        <p>
          ייתכנו רכיבים או תכנים של צד שלישי (כגון מפות Google) שאינם בשליטתנו המלאה. אנו ממשיכים
          לשפר את הנגישות באופן שוטף.
        </p>
        <h2 className="text-xl">פניות בנושא נגישות</h2>
        <p>
          נתקלתם בבעיית נגישות? נשמח לשמוע ולתקן. רכז הנגישות: אלי כליף. טלפון:{" "}
          <a href={`tel:${business.phoneTel}`} className="underline">
            {business.phone}
          </a>
          , מייל:{" "}
          <a href={`mailto:${business.email}`} className="underline">
            {business.email}
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">כתובת המשרד: {business.address}</p>
      </div>
    </main>
  );
}
