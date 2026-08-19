import { formatUpdatedFor, useLang } from "@/lib/i18n";

type Props = {
  /** תאריך עדכון אחרון (ISO). כשאין תאריך — לא מוצגת שורה כלל. */
  updatedAt?: string | null;
  className?: string;
};

/** שורת שקיפות קצרה: מתי המידע בסקשן עודכן לאחרונה. אין ניחושים — בלי תאריך אין שורה. */
export function DataSource({ updatedAt, className }: Props) {
  const { lang, t } = useLang();
  if (!updatedAt) return null;

  return (
    <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
      {t.dataSource.updated} {formatUpdatedFor(updatedAt, lang)}
    </p>
  );
}
