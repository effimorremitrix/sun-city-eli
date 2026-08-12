import { Database, FileCheck2 } from "lucide-react";
import { formatUpdated } from "@/lib/site-live";

type Props = {
  /** מקור המידע — מסד הנתונים או הזנה ידנית של המשרד */
  source: "db" | "office";
  /** תאריך עדכון אחרון (ISO). כשאין מידע יוצג "אין מידע" */
  updatedAt?: string | null;
  className?: string;
};

const LABEL: Record<Props["source"], string> = {
  db: "מקור המידע: מסד הנתונים של המשרד",
  office: 'מקור המידע: נתונים שהוזנו על ידי משרד סאן סיטי נדל"ן',
};

/** שורת שקיפות: מאיפה המידע ומתי עודכן. אין ניחושים — כשאין תאריך מוצג "אין מידע". */
export function DataSource({ source, updatedAt, className }: Props) {
  const Icon = source === "db" ? Database : FileCheck2;

  return (
    <p
      className={`flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground ${className ?? ""}`}
    >
      <Icon className="size-3.5 shrink-0 text-sun" aria-hidden="true" />
      <span>{LABEL[source]}</span>
      <span aria-hidden="true">·</span>
      <span>עודכן: {formatUpdated(updatedAt)}</span>
    </p>
  );
}
