-- site-media storage policies
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

-- listings coordinates
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS listings_coords_idx ON public.listings (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- deactivate personal agent pages
UPDATE public.sites SET is_active = false WHERE slug IN ('inbal', 'kobi', 'daniel');

-- instagram publishing
ALTER TABLE public.facebook_connections
  ADD COLUMN IF NOT EXISTS ig_user_id text;

ALTER TABLE public.listing_posts
  DROP CONSTRAINT IF EXISTS listing_posts_target_check;
ALTER TABLE public.listing_posts
  ADD CONSTRAINT listing_posts_target_check
  CHECK (target IN ('page', 'campaign', 'manual', 'instagram'));

-- scout candidates hard filter
ALTER TABLE public.scout_candidates
  ADD COLUMN IF NOT EXISTS has_mamad boolean,
  ADD COLUMN IF NOT EXISTS has_elevator boolean,
  ADD COLUMN IF NOT EXISTS has_parking boolean,
  ADD COLUMN IF NOT EXISTS has_balcony boolean;

UPDATE public.scout_candidates
SET status = 'rejected'
WHERE status = 'new' AND match_score < 60;