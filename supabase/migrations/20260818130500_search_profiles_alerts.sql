-- הסוכן האישי של הלקוח: חדרים מדויק/מקסימום, רחוב, והתראות וואטסאפ.
ALTER TABLE public.search_profiles
  ADD COLUMN IF NOT EXISTS rooms numeric,
  ADD COLUMN IF NOT EXISTS max_rooms numeric,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS notify_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

ALTER TABLE public.listing_notifications
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;

-- עדכון פונקציית ההתאמה:
-- 1. תנאים חדשים — חדרים מדויק (±0.5), מקסימום חדרים, רחוב (חיפוש חלקי בכתובת) —
--    באותו סגנון סלחני-ל-NULL של שאר התנאים.
-- 2. הרחבת שומר ההרשאות: גם סוכן שבבעלותו האתר של הנכס רשאי להריץ את ההתאמה
--    (עד כה admin בלבד — שבר יצירת התראות על נכסים של סוכנים).
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
      AND sp.deal_type = l.deal_type
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
