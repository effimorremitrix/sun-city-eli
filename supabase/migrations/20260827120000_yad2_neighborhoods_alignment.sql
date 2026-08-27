-- ============================================================
-- יישור רשימת השכונות לחלוקה של יד2 (ראו src/lib/neighborhoods.ts).
--
-- ארבעה ערכים היסטוריים הוחלפו בשמות של יד2:
--   "רמת חן"    -> "רמת חן ובן ציון"   (זו השכונה אצל יד2: hood 854)
--   "פארק ים"   -> "פארק הים"          (השם אצל יד2)
--   "מרכז העיר" -> "מרכז העיר דרום"    (יד2 מפצל את המרכז לשלושה אזורים;
--                                        דרום הוא הקירוב הנפוץ — אפשר לדייק
--                                        פר נכס בעריכה)
--   "צפון העיר" -> "כוכב הצפון"        (הקירוב הקרוב ביותר בחלוקה של יד2)
--
-- מעדכנים גם רשומות קיימות כדי שהסינון (השוואת מחרוזות מדויקת) והתאמת
-- הפרופילים ימשיכו למצוא אותן.
-- ============================================================

UPDATE public.listings SET neighborhood = 'רמת חן ובן ציון' WHERE neighborhood = 'רמת חן';
UPDATE public.listings SET neighborhood = 'פארק הים'        WHERE neighborhood = 'פארק ים';
UPDATE public.listings SET neighborhood = 'מרכז העיר דרום'  WHERE neighborhood = 'מרכז העיר';
UPDATE public.listings SET neighborhood = 'כוכב הצפון'      WHERE neighborhood = 'צפון העיר';

UPDATE public.sold_properties SET neighborhood = 'רמת חן ובן ציון' WHERE neighborhood = 'רמת חן';
UPDATE public.sold_properties SET neighborhood = 'פארק הים'        WHERE neighborhood = 'פארק ים';
UPDATE public.sold_properties SET neighborhood = 'מרכז העיר דרום'  WHERE neighborhood = 'מרכז העיר';
UPDATE public.sold_properties SET neighborhood = 'כוכב הצפון'      WHERE neighborhood = 'צפון העיר';

-- עמודות מערך: החלפת ערך תוך שמירה על סדר ומניעת כפילויות (unnest+distinct)
UPDATE public.search_profiles
SET neighborhoods = (
  SELECT COALESCE(array_agg(DISTINCT CASE hood
    WHEN 'רמת חן'    THEN 'רמת חן ובן ציון'
    WHEN 'פארק ים'   THEN 'פארק הים'
    WHEN 'מרכז העיר' THEN 'מרכז העיר דרום'
    WHEN 'צפון העיר' THEN 'כוכב הצפון'
    ELSE hood END), '{}')
  FROM unnest(neighborhoods) AS hood
)
WHERE neighborhoods && ARRAY['רמת חן','פארק ים','מרכז העיר','צפון העיר'];

UPDATE public.scout_profiles
SET neighborhoods = (
  SELECT COALESCE(array_agg(DISTINCT CASE hood
    WHEN 'רמת חן'    THEN 'רמת חן ובן ציון'
    WHEN 'פארק ים'   THEN 'פארק הים'
    WHEN 'מרכז העיר' THEN 'מרכז העיר דרום'
    WHEN 'צפון העיר' THEN 'כוכב הצפון'
    ELSE hood END), '{}')
  FROM unnest(neighborhoods) AS hood
)
WHERE neighborhoods && ARRAY['רמת חן','פארק ים','מרכז העיר','צפון העיר'];
