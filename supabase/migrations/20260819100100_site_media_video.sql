-- סרטונים בסליידר ההירו: מרחיבים את ה-bucket הציבורי site-media לקבצי וידאו
-- (mp4/webm) ומעלים את תקרת הקובץ ל-50MB — תמונות ממשיכות להיבדק בצד הלקוח
-- עד 5MB, התקרה כאן היא של האחסון עצמו.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm'
    ]
WHERE id = 'site-media';
