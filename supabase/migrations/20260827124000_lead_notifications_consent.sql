-- ============================================================
-- התראות התאמה גם ללידים (לקוחות בלי חשבון) + הסכמות דיוור.
--
-- 1. listing_notifications יכולה להצביע על ליד במקום על משתמש רשום:
--    user_id הופך ל-nullable ונוסף lead_id. עמודת error חושפת כשלי שליחה.
-- 2. עמודות הסכמה: ליד שסימן marketing_consent בטופס מקבל התראות התאמה
--    במייל/וואטסאפ; בלי הסכמה — שום דיוור יזום.
-- 3. RPC חדש match_listing_to_leads: מתאים נכס חדש ללידים פתוחים עם
--    קריטריונים מובנים והסכמה. דדופ מול מסלול המשתמשים הרשומים: ליד
--    שמקושר לפרופיל חיפוש (search_profile_id) מדולג — הוא מקבל את
--    ההתראה דרך match_listing_to_profiles.
-- ============================================================

ALTER TABLE public.listing_notifications
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS error text;

-- דדופ לשורות ממוקדות-ליד (המקבילה ל-UNIQUE של user_id/search_profile_id)
CREATE UNIQUE INDEX IF NOT EXISTS listing_notifications_lead_unique
  ON public.listing_notifications (listing_id, lead_id)
  WHERE lead_id IS NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

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
    INSERT INTO public.listing_notifications (lead_id, listing_id, reason)
    SELECT ld.id, l.id,
           'התאמה לדרישות הליד: ' || ld.full_name
    FROM public.leads ld
    WHERE ld.marketing_consent
      -- ליד סגור לא מקבל דיוור; ליד עם פרופיל חיפוש מקבל דרך מסלול המשתמשים
      AND ld.status NOT IN ('נסגרה עסקה', 'לא רלוונטי', 'לא בשל כרגע')
      AND ld.search_profile_id IS NULL
      AND (ld.email IS NOT NULL OR ld.phone IS NOT NULL)
      -- חייבים כוונת עסקה מובנית כדי להתאים בכלל
      AND ld.deal_type IS NOT NULL
      AND (ld.deal_type = l.deal_type
           OR (ld.deal_type = 'קנייה' AND l.deal_type = 'מכירה'))
      AND (ld.city IS NULL OR ld.city = '' OR ld.city = l.city)
      AND (array_length(ld.neighborhoods, 1) IS NULL OR l.neighborhood = ANY (ld.neighborhoods))
      AND (ld.min_price IS NULL OR l.price IS NULL OR l.price >= ld.min_price)
      AND (ld.max_price IS NULL OR l.price IS NULL OR l.price <= ld.max_price)
      AND (ld.min_rooms IS NULL OR l.rooms IS NULL OR l.rooms >= ld.min_rooms)
      AND (ld.max_rooms IS NULL OR l.rooms IS NULL OR l.rooms <= ld.max_rooms)
      AND (ld.min_size IS NULL OR l.size_sqm IS NULL OR l.size_sqm >= ld.min_size)
      -- קומה לא נבדקת כאן: listings.floor הוא טקסט חופשי
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
