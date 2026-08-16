-- Phase 0
UPDATE public.site_content c
SET business = c.business
  || jsonb_build_object('email', 'kalifeli.suncity@gmail.com', 'license', '30723354')
FROM public.sites s
WHERE s.id = c.site_id AND s.slug = 'sun-city';

-- Phase 1: agent sites
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

UPDATE public.listings l
SET site_id = s.id
FROM public.sites s
WHERE s.slug = 'sun-city' AND l.site_id IS NULL;

CREATE INDEX IF NOT EXISTS listings_site_id_idx ON public.listings (site_id);

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

CREATE OR REPLACE FUNCTION public.is_site_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.sites s WHERE s.owner_id = auth.uid())
$$;

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

CREATE OR REPLACE FUNCTION public.get_site_id(p_slug text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.sites s WHERE s.slug = p_slug AND s.is_active
$$;
GRANT EXECUTE ON FUNCTION public.get_site_id(text) TO anon, authenticated;

-- Phase 2: translations
CREATE TABLE public.listing_translations (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  lang text NOT NULL CHECK (lang IN ('en', 'fr', 'ru')),
  title text NOT NULL,
  description text,
  source_hash text NOT NULL,
  translated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, lang)
);
GRANT SELECT ON public.listing_translations TO anon, authenticated;
GRANT ALL ON public.listing_translations TO service_role;
ALTER TABLE public.listing_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_translations_public_select ON public.listing_translations
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.is_published));

-- Phase 4: facebook publishing
CREATE TABLE public.facebook_connections (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text NOT NULL,
  ad_account_id text,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.facebook_connections TO service_role;
ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.listing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  target text NOT NULL CHECK (target IN ('page', 'campaign', 'manual')),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  fb_post_id text,
  fb_campaign_id text,
  error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_posts TO authenticated;
GRANT ALL ON public.listing_posts TO service_role;
ALTER TABLE public.listing_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_posts_manage_select ON public.listing_posts
  FOR SELECT TO authenticated USING (public.owns_listing(listing_id));

CREATE TABLE public.facebook_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.facebook_groups TO authenticated;
GRANT ALL ON public.facebook_groups TO service_role;
ALTER TABLE public.facebook_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY facebook_groups_manage_select ON public.facebook_groups
  FOR SELECT TO authenticated USING (public.owns_site(site_id));
CREATE POLICY facebook_groups_manage_insert ON public.facebook_groups
  FOR INSERT TO authenticated WITH CHECK (public.owns_site(site_id));
CREATE POLICY facebook_groups_manage_delete ON public.facebook_groups
  FOR DELETE TO authenticated USING (public.owns_site(site_id));

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS post_copy jsonb;

-- Phase 5: sold properties
CREATE TABLE public.sold_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  address text NOT NULL,
  neighborhood text,
  note text,
  image_url text,
  storage_path text,
  sold_at date,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sold_properties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sold_properties TO authenticated;
GRANT ALL ON public.sold_properties TO service_role;
ALTER TABLE public.sold_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY sold_properties_public_select ON public.sold_properties
  FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY sold_properties_manage_select ON public.sold_properties
  FOR SELECT TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY sold_properties_manage_insert ON public.sold_properties
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY sold_properties_manage_update ON public.sold_properties
  FOR UPDATE TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY sold_properties_manage_delete ON public.sold_properties
  FOR DELETE TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER sold_properties_updated_at BEFORE UPDATE ON public.sold_properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX sold_properties_site_id_idx ON public.sold_properties (site_id);