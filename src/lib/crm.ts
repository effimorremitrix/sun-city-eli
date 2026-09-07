/**
 * ה-CRM של המשרד: משימות על ליד, אחראי, ערך עסקה וסיבת אובדן.
 *
 * מודל ההרשאות לא משתנה בשלב הזה: הפייפליין שייך לדף (site), ולכן כל סוכן
 * מנהל את הלידים והמשימות שלו והמנהל הראשי רואה את כל הצוות. assigned_user_id
 * הוא שדה אחריות בתוך הדף (למשל במשרד עצמו), לא גבול הרשאות.
 *
 * הקובץ איזומורפי בכוונה — אותן רשימות משמשות את הוולידציה בשרת ואת הבוררים
 * ב-UI, בדיוק כמו LEAD_STATUSES ב-leads.ts.
 */

/** סוגי המשימה — קובעים את האייקון ואת נוסח ברירת המחדל בכפתורים המהירים */
export const TASK_KINDS = [
  "שיחה",
  "וואטסאפ",
  "שליחת נכסים",
  "סיור",
  "פגישה",
  "מסמכים",
  "אחר",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ["פתוחה", "הושלמה", "בוטלה"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const isTaskKind = (v: unknown): v is TaskKind =>
  typeof v === "string" && (TASK_KINDS as readonly string[]).includes(v);

export const isTaskStatus = (v: unknown): v is TaskStatus =>
  typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);

/**
 * סיבות אובדן. רשימה סגורה כדי שהדוח יהיה בר-ספירה: "סיבה חופשית" לכל סוכן
 * הופכת את הניתוח לחסר ערך. "אחר" קיים בשביל המקרים החריגים, וההסבר נכנס
 * להערות הליד.
 */
export const LOST_REASONS = [
  "קנה דרך מתווך אחר",
  "לא נמצא נכס מתאים",
  "התקציב לא מספיק",
  "דחה את החיפוש",
  "לא ענה / נעלם",
  "פרטים שגויים",
  "רק בדק מחירים",
  "אחר",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const isLostReason = (v: unknown): v is LostReason =>
  typeof v === "string" && (LOST_REASONS as readonly string[]).includes(v);

/** משימות מוכנות בלחיצה — הפעולות שחוזרות בכל ליד */
export const TASK_PRESETS: ReadonlyArray<{
  key: string;
  title: string;
  kind: TaskKind;
  /** שעות מעכשיו למועד היעד */
  inHours: number;
}> = [
  { key: "call_back", title: "לחזור ללקוח", kind: "שיחה", inHours: 24 },
  { key: "send_listings", title: "לשלוח נכסים מתאימים", kind: "שליחת נכסים", inHours: 24 },
  { key: "tour", title: "לתאם סיור", kind: "סיור", inHours: 48 },
  { key: "check_in", title: "לבדוק מה קורה", kind: "שיחה", inHours: 24 * 7 },
];

/** משימת ליד כפי שהיא חוזרת מהשרת ל-UI */
export type LeadTask = {
  id: string;
  lead_id: string;
  site_id: string;
  assigned_user_id: string | null;
  title: string;
  kind: string;
  notes: string | null;
  due_at: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** האם המשימה באיחור — מועד יעד שעבר ועדיין פתוחה */
export const isTaskOverdue = (task: LeadTask, now: Date = new Date()): boolean =>
  task.status === "פתוחה" && task.due_at != null && Date.parse(task.due_at) < now.getTime();

/** שורת סוכן בלוח הצוות */
export type PipelineSiteRow = {
  siteId: string;
  name: string;
  slug: string | null;
  openLeads: number;
  newLeads: number;
  untouched: number;
  stale: number;
  tours: number;
  negotiation: number;
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  deals: number;
  dealValue: number;
  lost: number;
  lastActivityAt: string | null;
};

export type PipelineBoard = {
  from: string;
  to: string;
  isAdmin: boolean;
  perSite: PipelineSiteRow[];
  byStatus: Array<{ status: string; count: number; value: number }>;
  lostReasons: Array<{ reason: string; count: number }>;
  closedDeals: Array<{
    leadId: string;
    name: string;
    siteId: string;
    siteName: string;
    dealValue: number | null;
    closedAt: string | null;
  }>;
};

/** סכימת שורות לוח הצוות לשורת "סך הכול" — אותו טיפוס, בלי שם אתר */
export const sumPipelineRows = (rows: readonly PipelineSiteRow[]) =>
  rows.reduce(
    (acc, r) => ({
      openLeads: acc.openLeads + r.openLeads,
      newLeads: acc.newLeads + r.newLeads,
      untouched: acc.untouched + r.untouched,
      stale: acc.stale + r.stale,
      tours: acc.tours + r.tours,
      negotiation: acc.negotiation + r.negotiation,
      openTasks: acc.openTasks + r.openTasks,
      overdueTasks: acc.overdueTasks + r.overdueTasks,
      dueToday: acc.dueToday + r.dueToday,
      deals: acc.deals + r.deals,
      dealValue: acc.dealValue + r.dealValue,
      lost: acc.lost + r.lost,
    }),
    {
      openLeads: 0,
      newLeads: 0,
      untouched: 0,
      stale: 0,
      tours: 0,
      negotiation: 0,
      openTasks: 0,
      overdueTasks: 0,
      dueToday: 0,
      deals: 0,
      dealValue: 0,
      lost: 0,
    },
  );
