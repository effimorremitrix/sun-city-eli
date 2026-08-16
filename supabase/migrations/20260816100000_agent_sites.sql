-- Phase 1: per-agent personal sites.
-- Reuses public.sites / public.site_content: every agent = one sites row
-- (slug = the public URL /<slug>) + its own content. Listings belong to the
-- agent (site) that created them; NULL site_id marks legacy rows that belong
-- to the default 'sun-city' site (the owner's site).

-- 1. new role for agents (admin stays the single owner role).
--    The value must not be used elsewhere in this migration (PG restriction).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';

-- 2. sites: public visibility controls + ordering for the agents list
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 3. listings belong to a site
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

UPDATE public.listings l
SET site_id = s.id
FROM public.sites s
WHERE s.slug = 'sun-city' AND l.site_id IS NULL;

CREATE INDEX IF NOT EXISTS listings_site_id_idx ON public.listings (site_id);

-- 4. listings RLS: site owner manages their own listings, admin manages all.
--    (owns_site already returns true for admins on any site.)
DROP POLICY IF EXISTS "listings_admin_select" ON public.listings;
DROP POLICY IF EXISTS "listings_admin_insert" ON public.listings;
DROP POLICY IF EXISTS "listings_admin_update" ON public.listings;
DROP POLICY IF EXISTS "listings_admin_delete" ON public.listings;

CREATE POLICY "listings_manage_select" ON public.listings
  FOR SELECT TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_manage_insert" ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_manage_update" ON public.listings
  FOR UPDATE TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_manage_delete" ON public.listings
  FOR DELETE TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));

-- 5. listing_images RLS follows the parent listing's site
DROP POLICY IF EXISTS listing_images_admin_select ON public.listing_images;
DROP POLICY IF EXISTS listing_images_admin_insert ON public.listing_images;
DROP POLICY IF EXISTS listing_images_admin_update ON public.listing_images;
DROP POLICY IF EXISTS listing_images_admin_delete ON public.listing_images;

CREATE OR REPLACE FUNCTION public.owns_listing(_listing_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = _listing_id
      AND (public.owns_site(l.site_id) OR public.has_role(auth.uid(), 'admin'))
  )
$$;

CREATE POLICY listing_images_manage_select ON public.listing_images
  FOR SELECT TO authenticated USING (public.owns_listing(listing_id));
CREATE POLICY listing_images_manage_insert ON public.listing_images
  FOR INSERT TO authenticated WITH CHECK (public.owns_listing(listing_id));
CREATE POLICY listing_images_manage_update ON public.listing_images
  FOR UPDATE TO authenticated
  USING (public.owns_listing(listing_id)) WITH CHECK (public.owns_listing(listing_id));
CREATE POLICY listing_images_manage_delete ON public.listing_images
  FOR DELETE TO authenticated USING (public.owns_listing(listing_id));

-- 6. storage: image uploads are allowed to anyone who manages a site
--    (admin or a site-owning agent), not only the admin.
CREATE OR REPLACE FUNCTION public.is_site_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.sites s WHERE s.owner_id = auth.uid())
$$;

DROP POLICY IF EXISTS listing_images_storage_select ON storage.objects;
DROP POLICY IF EXISTS listing_images_storage_insert ON storage.objects;
DROP POLICY IF EXISTS listing_images_storage_update ON storage.objects;
DROP POLICY IF EXISTS listing_images_storage_delete ON storage.objects;

CREATE POLICY listing_images_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_site_manager());
CREATE POLICY listing_images_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND public.is_site_manager());
CREATE POLICY listing_images_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_site_manager())
  WITH CHECK (bucket_id = 'listing-images' AND public.is_site_manager());
CREATE POLICY listing_images_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_site_manager());

-- 7. get_public_site: expose id + slug for client-side listing filtering and
--    hide deactivated sites.
CREATE OR REPLACE FUNCTION public.get_public_site(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name,
    'business', COALESCE(c.business, '{}'::jsonb),
    'texts', COALESCE(c.texts, '{}'::jsonb),
    'hours', COALESCE(c.hours, '[]'::jsonb),
    'images', COALESCE(c.images, '{}'::jsonb),
    'settings', COALESCE(c.settings, '{}'::jsonb),
    'updated_at', GREATEST(
      COALESCE(c.updated_at, s.updated_at),
      COALESCE((SELECT max(i.updated_at) FROM public.site_items i WHERE i.site_id = s.id AND i.is_active), s.updated_at)
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'kind', i.kind, 'title', i.title, 'description', i.description,
        'price', i.price, 'price_note', i.price_note, 'image_url', i.image_url,
        'sort_order', i.sort_order, 'updated_at', i.updated_at
      ) ORDER BY i.sort_order, i.created_at)
      FROM public.site_items i WHERE i.site_id = s.id AND i.is_active
    ), '[]'::jsonb)
  )
  FROM public.sites s
  LEFT JOIN public.site_content c ON c.site_id = s.id
  WHERE s.slug = p_slug AND s.is_active
$$;

-- 8. public agents directory (active sites only, no owner_id leak)
CREATE OR REPLACE FUNCTION public.get_public_agents()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name,
    'agent_name', c.business->>'agentName',
    'role_title', c.business->>'roleTitle',
    'photo_url', c.business->>'photoUrl',
    'phone', c.business->>'phone',
    'phone_tel', c.business->>'phoneTel'
  ) ORDER BY s.sort_order, s.created_at), '[]'::jsonb)
  FROM public.sites s
  LEFT JOIN public.site_content c ON c.site_id = s.id
  WHERE s.is_active
$$;
GRANT EXECUTE ON FUNCTION public.get_public_agents() TO anon, authenticated;

-- 9. resolve a slug to a site id for anonymous listing queries
CREATE OR REPLACE FUNCTION public.get_site_id(p_slug text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.sites s WHERE s.slug = p_slug AND s.is_active
$$;
GRANT EXECUTE ON FUNCTION public.get_site_id(text) TO anon, authenticated;
