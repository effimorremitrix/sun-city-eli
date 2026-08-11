import { createFileRoute, Link } from "@tanstack/react-router";
import { business } from "@/lib/site-data";

const title = 'מדיניות פרטיות | סאן סיטי נדל"ן נתניה';
const description =
  'מדיניות הפרטיות של אתר סאן סיטי נדל"ן: איזה פרטים נאספים בטפסים, כיצד הם נשלחים בוואטסאפ ומה זכויותיכם.';

export const Route = createFileRoute("/privacy")({
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
      <h1 className="mt-4 text-3xl">מדיניות פרטיות</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-foreground">
        <p>
          אתר {business.name} אינו שומר מידע במסד נתונים. הפרטים שאתם ממלאים בטפסים
          (שם, טלפון, כתובת נכס ופרטי בקשה) נשלחים על ידכם אלינו כהודעת וואטסאפ בלבד,
          לאחר לחיצה על כפתור השליחה.
        </p>
        <h2 className="text-xl">שימוש במידע</h2>
        <p>
          המידע משמש אותנו ליצירת קשר, למתן הערכת שווי ולהתאמת נכסים לצרכים שלכם. איננו
          מוסרים את פרטיכם לצדדים שלישיים למטרות שיווק.
        </p>
        <h2 className="text-xl">שירותי צד שלישי</h2>
        <p>
          האתר מטמיע מפות Google וקישורים לוואטסאפ. השימוש בהם כפוף למדיניות הפרטיות של
          אותם ספקים.
        </p>
        <h2 className="text-xl">זכויותיכם</h2>
        <p>
          תוכלו לבקש בכל עת לעיין בפרטים שברשותנו, לתקן אותם או להסירם, בפנייה לטלפון{" "}
          <a href={`tel:${business.phone}`} className="underline">
            {business.phone}
          </a>{" "}
          או למייל{" "}
          <a href={`mailto:${business.email}`} className="underline">
            {business.email}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
