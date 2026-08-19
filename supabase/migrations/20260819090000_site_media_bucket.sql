-- נכסי המותג של האתר (לוגו ותמונות סוכנים) — bucket ייעודי וציבורי.
--
-- למה ציבורי, בשונה מ-listing-images הפרטי: הלוגו ותמונת הסוכן נטענים אצל גולשים
-- אנונימיים בכל עמוד. signed URL היה פג ודורש חתימה מחדש בכל טעינה, ולכן כאן
-- שומרים ב-site_content.business כתובת ציבורית קבועה (getPublicUrl).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = GREATEST(COALESCE(storage.buckets.file_size_limit, 0), 5242880),
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- קריאה פתוחה לכולם (זו הנקודה של bucket ציבורי); כתיבה רק למי שמנהל אתר —
-- אדמין או סוכן שהוא בעלים של אתר, לפי public.is_site_manager().
DROP POLICY IF EXISTS site_media_public_select ON storage.objects;
DROP POLICY IF EXISTS site_media_manager_insert ON storage.objects;
DROP POLICY IF EXISTS site_media_manager_update ON storage.objects;
DROP POLICY IF EXISTS site_media_manager_delete ON storage.objects;

CREATE POLICY site_media_public_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-media');

CREATE POLICY site_media_manager_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.is_site_manager());

CREATE POLICY site_media_manager_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND public.is_site_manager())
  WITH CHECK (bucket_id = 'site-media' AND public.is_site_manager());

CREATE POLICY site_media_manager_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND public.is_site_manager());
