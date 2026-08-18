-- שחזור רשימת הסוכנים + דף אישי לכל סוכן.
--
-- רקע: מדור "הצוות שלנו" הציג את רשימת המשרד הסטטית כל עוד היה במסד אתר אחד בלבד
-- (sun-city), וברגע שנוצר האתר השני (yelena) הרשימה הוחלפה בשתי רשומות המסד בלבד.
-- צד הקוד תוקן למיזוג במקום החלפה; כאן משלימים את הנתונים כך שלכל סוכן יהיה
-- באמת דף אישי חי בכתובת /<slug>.
--
-- חמשת הסוכנים הנוספים עדיין ללא חשבון משתמש, ו-sites.owner_id הוא NOT NULL
-- אל auth.users. לכן הדפים נוצרים בבעלות הבעלים של האתר הראשי (אלי), ומועברים
-- לסוכן עצמו כשיקבל חשבון — דרך "הוספת סוכן" באזור הניהול, שמאמץ אתר קיים.
--
-- אידמפוטנטי: אפשר להריץ שוב ושוב. תוכן שסוכן כבר ערך לעולם לא נדרס.

-- 1. רשומות ה-sites של חמשת הסוכנים החסרים, בבעלות הבעלים של האתר הראשי
INSERT INTO public.sites (slug, name, owner_id, sort_order)
SELECT v.slug, v.name, owner.owner_id, v.sort_order
FROM (SELECT owner_id FROM public.sites WHERE slug = 'sun-city' LIMIT 1) AS owner
CROSS JOIN (
  VALUES
    ('inbal',  'עינבל קובל בוזגלו', 2),
    ('kobi',   'קובי בוזגלו',       3),
    ('elad',   'אלעד אבוטבול',      5),
    ('koral',  'קוראל בוחבוט',      6),
    ('daniel', 'דניאל מוצא',        7)
) AS v(slug, name, sort_order)
ON CONFLICT (slug) DO NOTHING;

-- 2. סדר התצוגה של שתי הרשומות שכבר היו קיימות, כדי שיתאים לסדר הרוסטר
UPDATE public.sites SET sort_order = 1 WHERE slug = 'sun-city';
UPDATE public.sites SET sort_order = 4 WHERE slug = 'yelena';

-- 3. תוכן ראשוני לדפים החדשים: שם, תפקיד ותמונת הפרופיל מהרוסטר של המשרד.
--    DO NOTHING — לא נוגעים בשורת תוכן שכבר קיימת.
INSERT INTO public.site_content (site_id, business, texts)
SELECT
  s.id,
  jsonb_build_object(
    'agentName', v.agent_name,
    'roleTitle', v.role_title,
    'photoUrl',  v.photo_url,
    'bio',       '',
    'social',    jsonb_build_object('facebook', '', 'instagram', '', 'tiktok', '')
  ),
  jsonb_build_object('heroTitle', v.agent_name || ' — נדל"ן בנתניה')
FROM public.sites s
JOIN (
  VALUES
    ('inbal',  'עינבל קובל בוזגלו', 'מנהלת הצוות ושותפה, מומחית לדירות יד שנייה',
     '/__l5e/assets-v1/47682b76-ba79-4b35-87bf-83c8c310c7f4/agent-inbal.jpg'),
    ('kobi',   'קובי בוזגלו',       'יועץ נדל"ן ומשכנתאות, מרכז וצפון נתניה ותושבי חוץ',
     '/__l5e/assets-v1/c6f71e06-fcd5-4bf2-a020-b770a4696fe4/agent-kobi.jpg'),
    ('elad',   'אלעד אבוטבול',      'מומחה לדירות יד שנייה, מרכז ודרום נתניה',
     '/__l5e/assets-v1/2e278c4d-c225-4997-ab53-951d91cca8f3/agent-elad.jpg'),
    ('koral',  'קוראל בוחבוט',      'יועצת נדל"ן, הערכות שווי וליווי תושבי חוץ',
     '/__l5e/assets-v1/340c1a9d-e26c-4b87-82a6-d5951565ac1f/agent-koral.jpg'),
    ('daniel', 'דניאל מוצא',        'מומחה נדל"ן, דרום נתניה',
     '/__l5e/assets-v1/b46e4f6c-b954-46e2-890c-1d9d73e44b55/agent-daniel.jpg')
) AS v(slug, agent_name, role_title, photo_url) ON v.slug = s.slug
ON CONFLICT (site_id) DO NOTHING;

-- 4. ילנה: השם מנוקה מסיומת שם המשרד ותמונת הפרופיל הקודמת חוזרת.
--    התפקיד שהוזן באזור הניהול ("סוכנת נדל"ן בכירה") נשמר כמות שהוא.
UPDATE public.sites SET name = 'ילנה גנדלין' WHERE slug = 'yelena';

UPDATE public.site_content c
SET business = COALESCE(c.business, '{}'::jsonb) || jsonb_build_object(
  'agentName', 'ילנה גנדלין',
  'photoUrl',  '/__l5e/assets-v1/f11dc67e-a6c3-4874-9bf0-35b39c49ed03/agent-yelena.jpg'
)
FROM public.sites s
WHERE s.id = c.site_id AND s.slug = 'yelena';
