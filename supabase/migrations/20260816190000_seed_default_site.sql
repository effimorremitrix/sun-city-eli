-- תיקון נתונים: שורת ה-site של האתר הראשי (sun-city) מעולם לא נוצרה במסד,
-- ולכן טאבי הניהול תלויי-ה-site (נמכרו, פרסום, תוכן) לא תפקדו, וכל
-- המיגרציות שהפנו ל-slug 'sun-city' (עדכון מייל/רישיון, backfill נכסים,
-- זריעת דירות שנמכרו) הכניסו 0 שורות. כאן משלימים הכול, אידמפוטנטית.

-- 1. יצירת האתר הראשי בבעלות האדמין הראשון (אם קיים אדמין ואין עדיין site)
INSERT INTO public.sites (slug, name, owner_id)
SELECT 'sun-city', 'סאן סיטי נדל"ן', ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.sites s WHERE s.slug = 'sun-city')
ORDER BY ur.created_at
LIMIT 1;

-- 2. שיוך הנכסים הקיימים (ללא site_id) לאתר הראשי
UPDATE public.listings l
SET site_id = s.id
FROM public.sites s
WHERE s.slug = 'sun-city' AND l.site_id IS NULL;

-- 3. פרטי הקשר המעודכנים ב-site_content (יצירה אם אין שורה, עדכון אם יש)
INSERT INTO public.site_content (site_id, business)
SELECT s.id, jsonb_build_object('email', 'kalifeli.suncity@gmail.com', 'license', '30723354')
FROM public.sites s
WHERE s.slug = 'sun-city'
ON CONFLICT (site_id) DO UPDATE
SET business = public.site_content.business
  || jsonb_build_object('email', 'kalifeli.suncity@gmail.com', 'license', '30723354');

-- 4. זריעת שתי המכירות מפוסטרי ה"נמכר" (הפעם ה-site קיים)
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
