-- תפקיד "מנהל ראשי" (super admin) — שלב 1: הוספת הערך ל-enum.
-- חייב להיות בקובץ מיגרציה נפרד: ערך enum חדש אסור לשימוש באותה טרנזקציה שבה נוסף
-- (אותו דפוס כמו הוספת 'agent' במיגרציה 20260816164407).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
