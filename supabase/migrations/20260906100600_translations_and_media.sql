-- תרגומי תוכן דינמי: נכסים שנמכרו מקבלים עמודת translations כמו listings/site_items.
-- (ממליצים ושאלות נפוצות נשמרים בתוך site_content.translations הקיימת.)
ALTER TABLE public.sold_properties
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ממליצים/סרטונים: תקרת bucket ל-500MB, וקבצי .mov מאייפון (video/quicktime)
UPDATE storage.buckets
SET file_size_limit = 524288000,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
WHERE id = 'site-media';

-- גיבויים: bucket פרטי, service role בלבד (אין מדיניות ל-anon/authenticated)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backups', 'backups', false, 1073741824)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 1073741824;
