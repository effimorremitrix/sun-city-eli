-- ============================================================
-- מאגר שוק משותף: מודעות מהלוחות (יד2, קומו, מדלן, הומלס, וין וין) שנסרקו
-- על ידי הסריקה הלילית, עם דדופ לפי קישור המקור. הלקוחות רואים אותן
-- עם תיוג "מהשוק" וקישור למקור; הפנייה מנותבת לסוכן של סאן סיטי.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,                       -- yad2 / komo / madlan / homeless / winwin / ...
  source_site text,                           -- שם הלוח בעברית לתצוגה
  source_url text NOT NULL UNIQUE,
  external_id text,
  deal_type text NOT NULL DEFAULT 'מכירה' CHECK (deal_type IN ('מכירה', 'השכרה')),
  city text NOT NULL DEFAULT 'נתניה',
  neighborhood text,
  address text,
  title text NOT NULL,
  description text,
  price bigint,
  rooms numeric,
  size_sqm integer,
  floor text,
  has_mamad boolean,
  has_elevator boolean,
  has_parking boolean,
  has_balcony boolean,
  image_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_score integer,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,     -- לא נראה בסריקה 14 יום = לא פעיל
  hidden_by_admin boolean NOT NULL DEFAULT false,
  created_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_listings_active_idx
  ON public.market_listings (is_active, deal_type, neighborhood) WHERE NOT hidden_by_admin;
CREATE INDEX IF NOT EXISTS market_listings_first_seen_idx ON public.market_listings (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS market_listings_last_seen_idx ON public.market_listings (last_seen_at);

GRANT SELECT ON public.market_listings TO anon, authenticated;
GRANT ALL ON public.market_listings TO service_role;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_listings_public_select ON public.market_listings;
CREATE POLICY market_listings_public_select ON public.market_listings
  FOR SELECT TO anon, authenticated USING (is_active AND NOT hidden_by_admin);
DROP POLICY IF EXISTS market_listings_admin_select ON public.market_listings;
CREATE POLICY market_listings_admin_select ON public.market_listings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER market_listings_set_updated_at BEFORE UPDATE ON public.market_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- מצב הסריקה לכל משימה (סוג עסקה × שכונה) — כדי שכל ריצה של המתזמן תיקח
-- רק את מה שטרם נסרק היום, ותסיים בזמן סביר
CREATE TABLE IF NOT EXISTS public.market_scan_tasks (
  key text PRIMARY KEY,                       -- 'מכירה|עיר ימים'
  deal_type text NOT NULL,
  neighborhood text NOT NULL,
  demand integer NOT NULL DEFAULT 0,          -- כמה פרופילים/לידים מבקשים את זה
  last_scanned_at timestamptz,
  last_found integer,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.market_scan_tasks TO service_role;
ALTER TABLE public.market_scan_tasks ENABLE ROW LEVEL SECURITY;

-- ---- התראות על נכסים מהשוק ----
ALTER TABLE public.listing_notifications
  ALTER COLUMN listing_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS market_listing_id uuid REFERENCES public.market_listings(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE public.listing_notifications
    ADD CONSTRAINT listing_notifications_target_check
    CHECK ((listing_id IS NULL) <> (market_listing_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS listing_notifications_market_user_unique
  ON public.listing_notifications (user_id, market_listing_id, search_profile_id)
  WHERE market_listing_id IS NOT NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listing_notifications_market_lead_unique
  ON public.listing_notifications (lead_id, market_listing_id)
  WHERE market_listing_id IS NOT NULL AND lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_notifications_market_idx
  ON public.listing_notifications (market_listing_id) WHERE market_listing_id IS NOT NULL;

-- ---- התאמה: מודעות שוק חדשות (מאז p_since) מול פרופילים פעילים ולידים עם הסכמה ----
-- service role בלבד (הסריקה הלילית / שמירת פרופיל דרך השרת). auth.uid() IS NULL = קוד שרת.
CREATE OR REPLACE FUNCTION public.match_market_listings(p_since timestamptz, p_profile_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_leads integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH ins AS (
    INSERT INTO public.listing_notifications (user_id, contact_id, market_listing_id, search_profile_id, reason)
    SELECT sp.user_id, sp.contact_id, m.id, sp.id, 'התאמה מהשוק לפרופיל: ' || sp.label
    FROM public.search_profiles sp
    JOIN public.market_listings m
      ON m.is_active AND NOT m.hidden_by_admin
     AND m.first_seen_at >= p_since
    WHERE sp.is_active
      AND (p_profile_id IS NULL OR sp.id = p_profile_id)
      AND ((sp.deal_type IN ('קנייה', 'מכירה') AND m.deal_type = 'מכירה')
           OR (sp.deal_type = 'השכרה' AND m.deal_type = 'השכרה'))
      AND (sp.city IS NULL OR sp.city = '' OR sp.city = m.city)
      AND (array_length(sp.neighborhoods, 1) IS NULL OR m.neighborhood = ANY (sp.neighborhoods))
      AND (sp.min_price IS NULL OR m.price IS NULL OR m.price >= sp.min_price)
      AND (sp.max_price IS NULL OR m.price IS NULL OR m.price <= sp.max_price)
      AND (sp.min_rooms IS NULL OR m.rooms IS NULL OR m.rooms >= sp.min_rooms)
      AND (sp.rooms IS NULL OR m.rooms IS NULL OR abs(m.rooms - sp.rooms) <= 0.5)
      AND (sp.max_rooms IS NULL OR m.rooms IS NULL OR m.rooms <= sp.max_rooms)
      AND (sp.min_size IS NULL OR m.size_sqm IS NULL OR m.size_sqm >= sp.min_size)
      AND (NOT sp.needs_mamad OR m.has_mamad IS DISTINCT FROM false)
      AND (NOT sp.needs_elevator OR m.has_elevator IS DISTINCT FROM false)
      AND (NOT sp.needs_parking OR m.has_parking IS DISTINCT FROM false)
      AND (NOT sp.needs_balcony OR m.has_balcony IS DISTINCT FROM false)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  -- לידים אנונימיים עם הסכמת דיוור וקריטריונים (רק בריצה כללית, לא לפרופיל בודד)
  IF p_profile_id IS NULL THEN
    WITH ins AS (
      INSERT INTO public.listing_notifications (lead_id, contact_id, market_listing_id, reason)
      SELECT ld.id, ld.contact_id, m.id, 'התאמה מהשוק לדרישות הליד: ' || ld.full_name
      FROM public.leads ld
      JOIN public.market_listings m
        ON m.is_active AND NOT m.hidden_by_admin AND m.first_seen_at >= p_since
      WHERE ld.marketing_consent
        AND ld.status NOT IN ('נסגרה עסקה', 'לא רלוונטי', 'לא בשל כרגע')
        AND ld.search_profile_id IS NULL
        AND (ld.email IS NOT NULL OR ld.phone IS NOT NULL)
        AND ld.deal_type IN ('קנייה', 'השכרה')
        AND ((ld.deal_type = 'קנייה' AND m.deal_type = 'מכירה')
             OR (ld.deal_type = 'השכרה' AND m.deal_type = 'השכרה'))
        AND (ld.city IS NULL OR ld.city = '' OR ld.city = m.city)
        AND (array_length(ld.neighborhoods, 1) IS NULL OR m.neighborhood = ANY (ld.neighborhoods))
        AND (ld.min_price IS NULL OR m.price IS NULL OR m.price >= ld.min_price)
        AND (ld.max_price IS NULL OR m.price IS NULL OR m.price <= ld.max_price)
        AND (ld.min_rooms IS NULL OR m.rooms IS NULL OR m.rooms >= ld.min_rooms)
        AND (ld.max_rooms IS NULL OR m.rooms IS NULL OR m.rooms <= ld.max_rooms)
        AND (ld.min_size IS NULL OR m.size_sqm IS NULL OR m.size_sqm >= ld.min_size)
        AND (NOT ld.needs_mamad OR m.has_mamad IS DISTINCT FROM false)
        AND (NOT ld.needs_elevator OR m.has_elevator IS DISTINCT FROM false)
        AND (NOT ld.needs_parking OR m.has_parking IS DISTINCT FROM false)
        AND (NOT ld.needs_balcony OR m.has_balcony IS DISTINCT FROM false)
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_leads FROM ins;
  END IF;

  RETURN v_inserted + v_leads;
END;
$$;

-- התאמה מיידית של פרופיל חדש/מעודכן מול המלאי הקיים של המשרד (עד כאן התאמות
-- נוצרו רק כשהמשרד שמר נכס — לקוח חדש ראה רשימה ריקה עד הפרסום הבא).
CREATE OR REPLACE FUNCTION public.match_profile_to_listings(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  sp public.search_profiles;
BEGIN
  SELECT * INTO sp FROM public.search_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> sp.user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF NOT sp.is_active THEN RETURN 0; END IF;

  WITH ins AS (
    INSERT INTO public.listing_notifications (user_id, contact_id, listing_id, search_profile_id, reason)
    SELECT sp.user_id, sp.contact_id, l.id, sp.id, 'התאמה לפרופיל: ' || sp.label
    FROM public.listings l
    WHERE l.is_published
      AND ((sp.deal_type IN ('קנייה', 'מכירה') AND l.deal_type = 'מכירה')
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

  -- וגם מול מאגר השוק (30 הימים האחרונים)
  v_inserted := v_inserted + public.match_market_listings(now() - interval '30 days', p_profile_id);
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_profile_to_listings(uuid) TO authenticated;
