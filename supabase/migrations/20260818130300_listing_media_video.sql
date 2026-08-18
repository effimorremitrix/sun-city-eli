-- מדיה של נכסים: תמיכה בסרטונים לצד תמונות, באותה טבלה ובאותו bucket.
ALTER TABLE public.listing_images
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'image'
  CHECK (kind IN ('image', 'video'));

-- ה-bucket עצמו מנוהל בלוח הבקרה של Supabase; אם מוגדרות בו מגבלות —
-- מרחיבים אותן לווידאו (60MB, mp4/webm). אם השדות NULL — אין אכיפה ואין צורך בשינוי.
UPDATE storage.buckets
SET
  file_size_limit = GREATEST(COALESCE(file_size_limit, 0), 62914560),
  allowed_mime_types = CASE
    WHEN allowed_mime_types IS NULL THEN NULL
    ELSE ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
  END
WHERE id = 'listing-images';
