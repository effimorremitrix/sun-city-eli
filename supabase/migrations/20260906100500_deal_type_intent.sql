-- ============================================================
-- סוג עסקה: שני מרחבי ערכים שונים, ומעכשיו מוגדרים במפורש.
--   * צד המודעה (listings / market_listings): 'מכירה' | 'השכרה'.
--   * כוונת הלקוח (search_profiles / leads): 'קנייה' | 'השכרה' | 'מכירה'
--     כאשר 'מכירה' על ליד = הלקוח *מוכר* נכס (ולא קונה).
-- עד כאן 'מכירה' על פרופיל חיפוש פירושו היה "קונה" (ערך ישן), וב-leads
-- מוכרים הותאמו בטעות לנכסים למכירה. מיישרים: פרופילים → 'קנייה';
-- ההתאמות מתעלמות ממוכרים.
-- ============================================================

UPDATE public.search_profiles SET deal_type = 'קנייה' WHERE deal_type = 'מכירה';
UPDATE public.search_profiles SET deal_type = 'קנייה'
  WHERE deal_type IS NULL OR deal_type NOT IN ('קנייה', 'השכרה');
UPDATE public.listings SET deal_type = 'מכירה'
  WHERE deal_type IS NULL OR deal_type NOT IN ('מכירה', 'השכרה');

DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_deal_type_check
    CHECK (deal_type IN ('מכירה', 'השכרה'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.search_profiles ADD CONSTRAINT search_profiles_deal_type_check
    CHECK (deal_type IN ('קנייה', 'השכרה'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.leads ADD CONSTRAINT leads_deal_type_check
    CHECK (deal_type IS NULL OR deal_type IN ('קנייה', 'השכרה', 'מכירה')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.search_profiles ALTER COLUMN deal_type SET DEFAULT 'קנייה';

-- התאמת נכס חדש של המשרד לפרופילים — כוונת קונה בלבד
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
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.listings l2
      JOIN public.sites s ON s.id = l2.site_id
      WHERE l2.id = p_listing_id AND s.owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO l FROM public.listings WHERE id = p_listing_id AND is_published;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO public.listing_notifications (user_id, contact_id, listing_id, search_profile_id, reason)
    SELECT sp.user_id, sp.contact_id, l.id, sp.id,
           'התאמה לפרופיל: ' || sp.label
    FROM public.search_profiles sp
    WHERE sp.is_active
      AND ((sp.deal_type = 'קנייה' AND l.deal_type = 'מכירה')
           OR (sp.deal_type = 'השכרה' AND l.deal_type = 'השכרה'))
      AND (sp.city IS NULL OR sp.city = '' OR sp.city = l.city)
      AND (array_length(sp.neighborhoods, 1) IS NULL OR l.neighborhood = ANY (sp.neighborhoods))
      AND (sp.min_price IS NULL OR l.price IS NULL OR l.price >= sp.min_price)
      AND (sp.max_price IS NULL OR l.price IS NULL OR l.price <= sp.max_price)
      AND (sp.min_rooms IS NULL OR l.rooms IS NULL OR l.rooms >= sp.min_rooms)
      AND (sp.rooms IS NULL OR l.rooms IS NULL OR abs(l.rooms - sp.rooms) <= 0.5)
      AND (sp.max_rooms IS NULL OR l.rooms IS NULL OR l.rooms <= sp.max_rooms)
      AND (sp.street IS NULL OR sp.street = '' OR l.address ILIKE '%' || sp.street || '%')
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

-- התאמת נכס חדש ללידים — קונים/שוכרים בלבד, מוכרים לא מקבלים "נכס שמתאים לך"
CREATE OR REPLACE FUNCTION public.match_listing_to_leads(p_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  l public.listings;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.listings l2
      JOIN public.sites s ON s.id = l2.site_id
      WHERE l2.id = p_listing_id AND s.owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO l FROM public.listings WHERE id = p_listing_id AND is_published;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO public.listing_notifications (lead_id, contact_id, listing_id, reason)
    SELECT ld.id, ld.contact_id, l.id,
           'התאמה לדרישות הליד: ' || ld.full_name
    FROM public.leads ld
    WHERE ld.marketing_consent
      AND ld.status NOT IN ('נסגרה עסקה', 'לא רלוונטי', 'לא בשל כרגע')
      AND ld.search_profile_id IS NULL
      AND (ld.email IS NOT NULL OR ld.phone IS NOT NULL)
      AND ld.deal_type IN ('קנייה', 'השכרה')
      AND ((ld.deal_type = 'קנייה' AND l.deal_type = 'מכירה')
           OR (ld.deal_type = 'השכרה' AND l.deal_type = 'השכרה'))
      AND (ld.city IS NULL OR ld.city = '' OR ld.city = l.city)
      AND (array_length(ld.neighborhoods, 1) IS NULL OR l.neighborhood = ANY (ld.neighborhoods))
      AND (ld.min_price IS NULL OR l.price IS NULL OR l.price >= ld.min_price)
      AND (ld.max_price IS NULL OR l.price IS NULL OR l.price <= ld.max_price)
      AND (ld.min_rooms IS NULL OR l.rooms IS NULL OR l.rooms >= ld.min_rooms)
      AND (ld.max_rooms IS NULL OR l.rooms IS NULL OR l.rooms <= ld.max_rooms)
      AND (ld.min_size IS NULL OR l.size_sqm IS NULL OR l.size_sqm >= ld.min_size)
      AND (NOT ld.needs_mamad OR l.has_mamad)
      AND (NOT ld.needs_elevator OR l.has_elevator)
      AND (NOT ld.needs_parking OR l.has_parking)
      AND (NOT ld.needs_balcony OR l.has_balcony)
    ON CONFLICT (listing_id, lead_id) WHERE lead_id IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN v_inserted;
END;
$$;
