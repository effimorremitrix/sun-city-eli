-- קטגוריות הנכס על כרטיס הליד: מה הוא מחפש לקנות/לשכור ומה הוא רוצה למכור.
--
-- עד כה הכוונה הזו נשמרה רק כטקסט חופשי ב-notes, ולכן לא ניתן היה לסנן, לספור
-- או להתאים נכסים לפיה.
--
-- text[] ולא enum, ובלי CHECK: אותה החלטה שכבר תועדה ב-20260820150000 לגבי
-- status ו-source — הרשימה הסגורה חיה ב-src/lib/leads.ts (PROPERTY_CATEGORIES)
-- והוולידציה אפליקטיבית, כך שהוספת קטגוריה היא שינוי קוד ולא מיגרציה.
-- המערך בדפוס search_profiles.neighborhoods; ברירת המחדל '{}' שומרת על לידים
-- קיימים תקינים בלי backfill.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buy_categories  text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sell_categories text[] NOT NULL DEFAULT '{}'::text[];

-- GIN לחיפוש הכלה (buy_categories @> ARRAY['דירה']) לדוחות ולסינון עתידי
CREATE INDEX IF NOT EXISTS leads_buy_categories_idx
  ON public.leads USING gin (buy_categories);
CREATE INDEX IF NOT EXISTS leads_sell_categories_idx
  ON public.leads USING gin (sell_categories);
