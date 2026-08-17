import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Lightbulb,
  Minus,
  Plus,
  Radar,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

type GuideSection = {
  id: string;
  icon: LucideIcon;
  title: string;
  intro: string;
  steps: string[];
  tips?: string[];
};

const guideSections: GuideSection[] = [
  {
    id: "roles",
    icon: ShieldCheck,
    title: "כניסה והרשאות ניהול",
    intro:
      "אזור הניהול פתוח רק למשתמשים עם תפקיד מנהל. ההרשאה נבדקת גם בצד השרת, כך שמשתמש רגיל לא יכול לגשת לנתוני הניהול.",
    steps: [
      'נכנסים לאתר עם המייל והסיסמה בעמוד ההתחברות, ואז לוחצים על הקישור "אזור ניהול" שמופיע למנהלים בראש האזור האישי ובתפריט האתר.',
      'בהקמה ראשונה של המערכת, כשעדיין אין אף מנהל, עמוד הניהול מציג כפתור "הגדרת החשבון הזה כמנהל הראשון של המערכת" — לחיצה עליו הופכת אתכם למנהל. הכפתור עובד רק כל עוד אין מנהלים.',
      'מינוי מנהלים נוספים או הסרת הרשאה נעשים בטאב "משתמשים רשומים" באזור הניהול (פירוט בהמשך המדריך).',
    ],
    tips: ['אם מופיעה הודעת "אין לך הרשאת ניהול" — בקשו ממנהל קיים למנות אתכם דרך טאב המשתמשים.'],
  },
  {
    id: "listings",
    icon: Building2,
    title: "טאב נכסים — ניהול נכסי האתר",
    intro:
      "כאן מוסיפים, עורכים ומוחקים את הנכסים שמוצגים באתר. נכס שמפורסם נשלח אוטומטית ללקוחות שהגדירו פרופיל חיפוש תואם.",
    steps: [
      "ממלאים את פרטי הנכס: כותרת, סוג עסקה (מכירה/השכרה), שכונה, כתובת, מחיר, חדרים, שטח במ״ר, קומה, תגית ותיאור.",
      "מסמנים את מאפייני הנכס: ממ״ד, מעלית, חניה ומרפסת.",
      "מעלים עד 10 תמונות לנכס (קבצי JPG / PNG / WebP עד 5MB לתמונה), קובעים תמונת שער ומסדרים את סדר התמונות.",
      'מסמנים "מפורסם" כדי שהנכס יופיע באתר, או מבטלים את הסימון כדי לשמור אותו כטיוטה מוסתרת.',
      "בשמירת נכס מפורסם המערכת מאתרת אוטומטית לקוחות עם פרופיל חיפוש תואם, יוצרת להם התראה באזור האישי ושולחת מייל — הודעת האישור מציגה כמה לקוחות תואמים נמצאו וכמה מיילים נשלחו.",
    ],
    tips: [
      "אין להזין נכס שאינו אמיתי — כל פרסום שולח התראות ומיילים ללקוחות.",
      'שדה שלא מולא יוצג באתר כ"אין מידע", לכן כדאי למלא כמה שיותר פרטים.',
    ],
  },
  {
    id: "scout",
    icon: Radar,
    title: "טאב סוכן סריקה — איתור נכסים אוטומטי",
    intro:
      "סוכן הסריקה סורק אתרי נדל״ן ומציע נכסים חדשים שמתאימים לקריטריונים שהגדרתם. המספר שמופיע על הטאב הוא כמות ההצעות החדשות שמחכות לבדיקה.",
    steps: [
      "מגדירים פרופיל סריקה: קריטריונים לנכס ואתרי מקור לסריקה (יד2, מדלן, הומלס, קומו, ווינווין).",
      'לוחצים "סרוק עכשיו" להרצה מיידית — בנוסף, המערכת מריצה סריקה אוטומטית פעם ביום.',
      "עוברים על תור המועמדים ומסננים לפי סטטוס: חדש / מאושר / נדחה. בכל מועמד אפשר לפתוח את המודעה המקורית באתר המקור.",
      'לוחצים "אישור — צור טיוטת נכס" כדי להפוך מועמד לטיוטת נכס בטאב הנכסים, או "דחייה" כדי להסיר אותו (דחייה ניתנת לשחזור).',
      "משלימים בטיוטה את הפרטים החסרים ואת התמונות, ורק אז מסמנים אותה כמפורסמת.",
    ],
    tips: ["אישור מועמד לא מפרסם אותו באתר — הוא יוצר טיוטה בלבד, והפרסום נעשה ידנית בטאב הנכסים."],
  },
  {
    id: "content",
    icon: Store,
    title: "טאב תוכן העסק — פרטי המשרד וטקסטים",
    intro: "כאן מעדכנים את הפרטים והטקסטים שמוצגים לגולשים באתר, בלי צורך במתכנת.",
    steps: [
      "מעדכנים את פרטי העסק: שם, סלוגן, כותרת משנה, כתובת, טלפון, מייל ומספר רישיון תיווך.",
      "מעדכנים את הטקסטים הראשיים של דף הבית: כותרת ותת־כותרת.",
      "לוחצים שמירה — השינויים נכנסים לתוקף באתר מיד.",
    ],
  },
  {
    id: "users",
    icon: Users,
    title: "טאב משתמשים רשומים — ניהול לקוחות והרשאות",
    intro:
      'רשימת כל המשתמשים הרשומים באתר: שם, מייל, תאריך הרשמה, תג "מנהל", וכמות פרופילי החיפוש וההתראות של כל אחד.',
    steps: [
      "מחפשים משתמש בשדה החיפוש החופשי לפי שם או מייל.",
      "פותחים משתמש כדי לצפות בפרופילי החיפוש שהגדיר (מה הלקוח מחפש).",
      "ממנים משתמש למנהל או מסירים הרשאת ניהול — הפעולה דורשת אישור. לא ניתן לשנות את ההרשאה של עצמכם ולא ניתן להסיר את המנהל האחרון במערכת.",
      "מוחקים משתמש בעת הצורך — לביטחון, המחיקה דורשת הקלדת המייל של המשתמש לאישור. לא ניתן למחוק את החשבון של עצמכם.",
    ],
    tips: ["מחיקת משתמש היא סופית ומוחקת גם את הפרופילים וההתראות שלו — השתמשו בזהירות."],
  },
  {
    id: "usage",
    icon: BarChart3,
    title: "טאב שימוש (Usage) — מעקב צריכת AI",
    intro: "לוח בקרה של צריכת שירותי ה-AI של סוכן הסריקה, כולל אומדן עלות — כדי לשלוט בהוצאות.",
    steps: [
      "בוחרים טווח זמן: 7 ימים / 30 ימים / החודש הנוכחי.",
      "עוקבים אחרי הסיכומים: כמות קריאות, טוקנים נכנסים ויוצאים, אומדן עלות בדולרים ושגיאות.",
      "בגרף היומי רואים את התפלגות השימוש לאורך הטווח, ובטבלאות — פירוט לפי מודל ואת 50 הקריאות האחרונות כולל מייל המשתמש והאם הקריאה הצליחה.",
    ],
    tips: ["העלות המוצגת היא אומדן לפי מחירון הספק — החיוב בפועל מופיע אצל ספק ה-AI."],
  },
  {
    id: "tips",
    icon: Lightbulb,
    title: "דגשים חשובים",
    intro: "כמה כללים שכדאי לזכור בעבודה שוטפת עם המערכת.",
    steps: [
      "כל פרסום נכס שולח מיילים אמיתיים ללקוחות — לפרסם רק נכסים אמיתיים ומעודכנים.",
      "טיוטות שנוצרו מסוכן הסריקה דורשות בדיקה, השלמת פרטים ותמונות ופרסום ידני.",
      'שדות שלא מולאו מוצגים לגולשים כ"אין מידע" — עדיף למלא הכל.',
      'שינוי מייל או סיסמה של החשבון שלכם נעשה בטאב "החשבון שלי" כאן באזור האישי.',
    ],
  },
];

export default function AdminGuide() {
  const [open, setOpen] = useState<string | null>(guideSections[0]?.id ?? null);

  return (
    <div>
      <section className="soft-card mt-6 p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <BookOpen className="size-5 text-sun" aria-hidden="true" />
          מדריך למנהל המערכת
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          כל מה שצריך לדעת כדי לתפעל את אזור הניהול: ניהול נכסים, סוכן הסריקה, תוכן העסק, משתמשים
          ומעקב שימוש. פתחו כל נושא לקריאת ההסבר המלא.
        </p>
        <Link
          to="/admin"
          className="mt-4 inline-flex rounded-xl bg-sun px-5 py-3 text-sm font-bold text-sun-foreground"
        >
          מעבר לאזור הניהול
        </Link>
      </section>

      <ul className="mt-4 space-y-3">
        {guideSections.map((s) => {
          const isOpen = open === s.id;
          const Icon = s.icon;
          return (
            <li key={s.id} className="soft-card overflow-hidden">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-right text-base font-bold text-primary"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-5 shrink-0 text-sun" aria-hidden="true" />
                    {s.title}
                  </span>
                  {isOpen ? (
                    <Minus className="size-5 shrink-0 text-sun" aria-hidden="true" />
                  ) : (
                    <Plus className="size-5 shrink-0 text-sun" aria-hidden="true" />
                  )}
                </button>
              </h3>
              {isOpen && (
                <div className="border-t border-border p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.intro}</p>
                  <ol className="mt-3 list-decimal space-y-1.5 pe-6 text-sm leading-relaxed text-foreground">
                    {s.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {s.tips && s.tips.length > 0 && (
                    <div className="mt-3 rounded-xl bg-secondary p-3">
                      <p className="text-xs font-bold text-primary">שימו לב</p>
                      <ul className="mt-1 list-disc space-y-1 pe-5 text-xs leading-relaxed text-muted-foreground">
                        {s.tips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
