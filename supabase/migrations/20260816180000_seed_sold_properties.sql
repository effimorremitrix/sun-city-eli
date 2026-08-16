-- זריעת שתי המכירות מפוסטרי ה"נמכר" של המשרד למדור "נמכר על ידינו".
-- התמונות מועלות מהניהול (טאב נמכרו → עריכה → העלאת תמונה).
-- מוגן מפני הרצה כפולה: לא מוסיף כתובת שכבר קיימת לאותו site.
INSERT INTO public.sold_properties (site_id, address, neighborhood, sort_order, is_published)
SELECT s.id, v.address, v.neighborhood, v.sort_order, true
FROM public.sites s
CROSS JOIN (
  VALUES
    ('יוספטל 7 נתניה', 'נאות הרצל', 0),
    ('איכילוב 4 נתניה', NULL, 1)
) AS v(address, neighborhood, sort_order)
WHERE s.slug = 'sun-city'
  AND NOT EXISTS (
    SELECT 1 FROM public.sold_properties sp
    WHERE sp.site_id = s.id AND sp.address = v.address
  );
