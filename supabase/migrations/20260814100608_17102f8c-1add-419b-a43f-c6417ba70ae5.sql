-- ========== 1. listings ==========
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type text NOT NULL DEFAULT 'מכירה',
  title text NOT NULL,
  description text,
  city text NOT NULL DEFAULT 'נתניה',
  neighborhood text,
  address text,
  price numeric,
  rooms numeric,
  size_sqm numeric,
  floor text,
  has_mamad boolean NOT NULL DEFAULT false,
  has_elevator boolean NOT NULL DEFAULT false,
  has_parking boolean NOT NULL DEFAULT false,
  has_balcony boolean NOT NULL DEFAULT false,
  tag text,
  image_url text,
  image_key text,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_public_select" ON public.listings
  FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "listings_admin_select" ON public.listings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_admin_insert" ON public.listings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_admin_update" ON public.listings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_admin_delete" ON public.listings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== 2. search_profiles ==========
CREATE TABLE public.search_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'הסוכן האישי שלי',
  deal_type text NOT NULL DEFAULT 'מכירה',
  city text NOT NULL DEFAULT 'נתניה',
  neighborhoods text[] NOT NULL DEFAULT '{}',
  min_price numeric,
  max_price numeric,
  min_rooms numeric,
  min_size numeric,
  needs_mamad boolean NOT NULL DEFAULT false,
  needs_elevator boolean NOT NULL DEFAULT false,
  needs_parking boolean NOT NULL DEFAULT false,
  needs_balcony boolean NOT NULL DEFAULT false,
  notes text,
  notify_email boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_profiles TO authenticated;
GRANT ALL ON public.search_profiles TO service_role;

ALTER TABLE public.search_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_profiles_select" ON public.search_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "search_profiles_insert" ON public.search_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "search_profiles_update" ON public.search_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "search_profiles_delete" ON public.search_profiles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER search_profiles_updated_at BEFORE UPDATE ON public.search_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== 3. listing_notifications ==========
CREATE TABLE public.listing_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  search_profile_id uuid REFERENCES public.search_profiles(id) ON DELETE CASCADE,
  reason text,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id, search_profile_id)
);

GRANT SELECT, UPDATE ON public.listing_notifications TO authenticated;
GRANT ALL ON public.listing_notifications TO service_role;

ALTER TABLE public.listing_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_notifications_select" ON public.listing_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "listing_notifications_update" ON public.listing_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER listing_notifications_updated_at BEFORE UPDATE ON public.listing_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX listing_notifications_user_idx ON public.listing_notifications (user_id, created_at DESC);

-- ========== 4. matching function ==========
CREATE OR REPLACE FUNCTION public.match_listing_to_profiles(p_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  l public.listings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO l FROM public.listings WHERE id = p_listing_id AND is_published;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO public.listing_notifications (user_id, listing_id, search_profile_id, reason)
    SELECT sp.user_id, l.id, sp.id,
           'התאמה לפרופיל: ' || sp.label
    FROM public.search_profiles sp
    WHERE sp.is_active
      AND sp.deal_type = l.deal_type
      AND (sp.city IS NULL OR sp.city = '' OR sp.city = l.city)
      AND (array_length(sp.neighborhoods, 1) IS NULL OR l.neighborhood = ANY (sp.neighborhoods))
      AND (sp.min_price IS NULL OR l.price IS NULL OR l.price >= sp.min_price)
      AND (sp.max_price IS NULL OR l.price IS NULL OR l.price <= sp.max_price)
      AND (sp.min_rooms IS NULL OR l.rooms IS NULL OR l.rooms >= sp.min_rooms)
      AND (sp.min_size IS NULL OR l.size_sqm IS NULL OR l.size_sqm >= sp.min_size)
      AND (NOT sp.needs_mamad OR l.has_mamad)
      AND (NOT sp.needs_elevator OR l.has_elevator)
      AND (NOT sp.needs_parking OR l.has_parking)
      AND (NOT sp.needs_balcony OR l.has_balcony)
    ON CONFLICT (user_id, listing_id, search_profile_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.match_listing_to_profiles(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.match_listing_to_profiles(uuid) TO authenticated, service_role;

-- ========== 5. seed real listings ==========
INSERT INTO public.listings
 (title, deal_type, price, neighborhood, address, rooms, size_sqm, floor, tag,
  has_mamad, has_elevator, has_parking, has_balcony, description, image_key, sort_order)
VALUES
 ('דירת 5 חדרים, 166 מ"ר, שלום עליכם 15','מכירה',3540000,'אגמים','שלום עליכם 15, אגמים, נתניה',5,166,'8','בלעדי',
  true,true,true,true,'דירת 5 חדרים מרווחת בשכונת אגמים, 166 מ"ר בקומה 8. נכס בבלעדיות המשרד.','prop-1',1),
 ('בית דו משפחתי 4 חדרים, 370 מ"ר, אפרים אהרונסון 26','מכירה',3990000,'רמת אפרים','אפרים אהרונסון 26, רמת אפרים, נתניה',4,370,'קרקע','בלעדי',
  true,false,true,true,'בית דו משפחתי ברמת אפרים, 4 חדרים, 370 מ"ר בקומת קרקע. נכס בבלעדיות המשרד.','prop-2',2),
 ('דירת 4 חדרים, 112 מ"ר, שבטי ישראל 19','מכירה',2395000,'קריית השרון','שבטי ישראל 19, קריית השרון, נתניה',4,112,'8','בלעדי',
  true,true,true,true,'דירת 4 חדרים בקריית השרון, 112 מ"ר בקומה 8, עם חניה וממ"ד. נכס בבלעדיות המשרד.','prop-3',3),
 ('דירת 4 חדרים, 92 מ"ר, שמואל הנציב 39','מכירה',1830000,'צפון מערב מרכז העיר','שמואל הנציב 39, צפון מערב מרכז העיר, נתניה',4,92,'3','בלעדי',
  false,true,false,true,'דירת 4 חדרים בצפון מערב מרכז העיר, 92 מ"ר בקומה 3. נכס בבלעדיות המשרד.','prop-4',4),
 ('דירת 4 חדרים, 90 מ"ר, יהודה הנשיא 15','מכירה',1850000,'צפון מערב מרכז העיר','יהודה הנשיא 15, צפון מערב מרכז העיר, נתניה',4,90,'3','בלעדי',
  false,true,false,true,'דירת 4 חדרים בצפון מערב מרכז העיר, 90 מ"ר בקומה 3. נכס בבלעדיות המשרד.','prop-5',5),
 ('דירת 4 חדרים, 95 מ"ר, הרב קוק 43','מכירה',1790000,'צפון מערב מרכז העיר','הרב קוק 43, צפון מערב מרכז העיר, נתניה',4,95,'8',NULL,
  false,true,true,true,'דירת 4 חדרים, 95 מ"ר בקומה 8, עם חניה ובמרחק קצר מהים.','prop-6',6),
 ('דירת 4 חדרים, 94 מ"ר, יהודה הלוי 26','מכירה',1790000,'מרכז העיר','יהודה הלוי 26, מרכז העיר דרום, נתניה',4,94,'5','בלעדי',
  false,true,false,true,'דירת 4 חדרים במרכז העיר דרום, 94 מ"ר בקומה 5. נכס בבלעדיות המשרד.','prop-7',7),
 ('דירת 4 חדרים, 79 מ"ר, בנימין מינץ 8','מכירה',1590000,'נאות הרצל','בנימין מינץ 8, נאות הרצל, נתניה',4,79,'2','בלעדי',
  false,true,false,true,'דירת 4 חדרים בנאות הרצל, 79 מ"ר בקומה 2. נכס בבלעדיות המשרד.','prop-8',8);

-- ========== 6. simplify permissions: admin only, no site owners ==========
DROP TABLE IF EXISTS public.site_edit_links;

CREATE OR REPLACE FUNCTION public.owns_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

DROP POLICY IF EXISTS "sites_select_owner_or_admin" ON public.sites;
DROP POLICY IF EXISTS "sites_update_owner_or_admin" ON public.sites;
CREATE POLICY "sites_admin_select" ON public.sites
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sites_admin_update" ON public.sites
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS sites_protect_owner ON public.sites;
DROP FUNCTION IF EXISTS public.protect_site_owner();