-- תיקון העלאת הלוגו באזור האישי: ה-bucket‏ site-media בפרויקט החי נשאר פרטי.
--
-- רקע: 20260819090000_site_media_bucket.sql יצר את ה-bucket עם public = true, אבל
-- הוא כבר היה קיים (פרטי) — ה-INSERT נפל ל-ON CONFLICT, וה-UPDATE שם מעולם לא
-- הגיע לדגל public. התוצאה: uploadSiteMedia מעלה את הקובץ בהצלחה, אבל
-- getPublicUrl מחזירה כתובת /object/public/... שמחזירה
-- {"code":"NoSuchBucket"} — התצוגה המקדימה נשברת והלוגו לעולם לא מוצג.
-- מכאן גם ה-logoUrl של sun-city, ששמור ככתובת חתומה (/object/sign/…?token=…) —
-- מעקף ידני שנעשה בזמנו בדיוק בגלל זה.
--
-- לכן כאן UPDATE ישיר ובלתי-מותנה, ולא INSERT ... ON CONFLICT: אידמפוטנטי,
-- ולא תלוי בשאלה אם ה-bucket כבר קיים.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = GREATEST(COALESCE(file_size_limit, 0), 52428800),
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm'
  ]
WHERE id = 'site-media';

-- נרמול הכתובות החתומות ששמורות כבר ב-site_content.business לכתובות ציבוריות.
-- הכתובות החתומות ימשיכו לעבוד עד לפקיעתן, אבל אין סיבה להשאיר שני סוגי כתובות
-- לאותו bucket ציבורי. הדפוס:
--   /object/sign/site-media/<path>?token=…  →  /object/public/site-media/<path>
-- ה-regexp מיושם ישירות (בלי פונקציית עזר) כדי שהמיגרציה תהיה הצהרה אחת לכל
-- שדה ולא תתלה בהגדרת פונקציה שנשארת לאורך ה-session.
-- מפתח שלא היה קיים ברשומה נכתב כמחרוזת ריקה — בדיוק ערך ברירת המחדל של
-- LiveBusiness (src/lib/site-live.tsx), כלומר "אין לוגו, השתמש במובנה".

UPDATE public.site_content c
SET business = c.business || jsonb_build_object(
  'logoUrl', regexp_replace(COALESCE(c.business ->> 'logoUrl', ''),
    '/storage/v1/object/sign/site-media/([^?]+)(\?.*)?$',
    '/storage/v1/object/public/site-media/\1'),
  'logoIconUrl', regexp_replace(COALESCE(c.business ->> 'logoIconUrl', ''),
    '/storage/v1/object/sign/site-media/([^?]+)(\?.*)?$',
    '/storage/v1/object/public/site-media/\1'),
  'photoUrl', regexp_replace(COALESCE(c.business ->> 'photoUrl', ''),
    '/storage/v1/object/sign/site-media/([^?]+)(\?.*)?$',
    '/storage/v1/object/public/site-media/\1')
)
WHERE c.business IS NOT NULL
  AND (
    COALESCE(c.business ->> 'logoUrl', '')     LIKE '%/object/sign/site-media/%'
    OR COALESCE(c.business ->> 'logoIconUrl', '') LIKE '%/object/sign/site-media/%'
    OR COALESCE(c.business ->> 'photoUrl', '')    LIKE '%/object/sign/site-media/%'
  );

-- heroImages הוא מערך JSONB — מנורמל איבר-איבר
UPDATE public.site_content c
SET business = c.business || jsonb_build_object('heroImages', (
      SELECT COALESCE(jsonb_agg(to_jsonb(regexp_replace(img,
               '/storage/v1/object/sign/site-media/([^?]+)(\?.*)?$',
               '/storage/v1/object/public/site-media/\1'))), '[]'::jsonb)
      FROM jsonb_array_elements_text(c.business -> 'heroImages') AS t(img)
    ))
WHERE jsonb_typeof(c.business -> 'heroImages') = 'array'
  AND c.business ->> 'heroImages' LIKE '%/object/sign/site-media/%';
