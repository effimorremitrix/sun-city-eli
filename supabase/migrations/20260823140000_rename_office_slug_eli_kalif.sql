-- הדף האישי של אלי כליף — שהוא גם רשומת ה-site של המשרד — עובר מ-/sun-city
-- ל-/eli-kalif. משנים רק את ה-slug: ה-id נשאר, ולכן הנכסים, המכירות, התוכן
-- וההרשאות ממשיכים להיות משויכים לאותה רשומה. הכתובת הישנה /sun-city מפנה
-- בהפניה קבועה (301) לחדשה מתוך הראוט האישי (LEGACY_SLUG_REDIRECTS).
-- אידמפוטנטי: הרצה חוזרת, או מסד שבו כבר קיים eli-kalif, לא משנים דבר.
UPDATE public.sites
SET slug = 'eli-kalif'
WHERE slug = 'sun-city'
  AND NOT EXISTS (SELECT 1 FROM public.sites s2 WHERE s2.slug = 'eli-kalif');
