-- ============================================================
-- תמיכה בכוונת "קנייה" בהתאמת פרופילי חיפוש.
--
-- deal_type של נכס הוא צד המודעה: 'מכירה' / 'השכרה'. עד עכשיו פרופיל חיפוש
-- הועתק מאותו אוצר מילים, ולקוח שמחפש *לקנות* נאלץ לבחור "מכירה". מהיום
-- פרופיל יכול לשאת 'קנייה' (כוונת קונה), וההתאמה ממפה אותה לנכסי 'מכירה'.
-- ההגדרה זהה לגרסה הקודמת פרט לתנאי ה-deal_type.
-- ============================================================

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
  IF NOT (
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
    INSERT INTO public.listing_notifications (user_id, listing_id, search_profile_id, reason)
    SELECT sp.user_id, l.id, sp.id,
           'התאמה לפרופיל: ' || sp.label
    FROM public.search_profiles sp
    WHERE sp.is_active
      -- 'קנייה' היא כוונת קונה — תואמת נכסים שעומדים למכירה
      AND (sp.deal_type = l.deal_type
           OR (sp.deal_type = 'קנייה' AND l.deal_type = 'מכירה'))
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
