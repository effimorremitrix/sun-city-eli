UPDATE public.listings SET neighborhood = 'רמת חן ובן ציון' WHERE neighborhood = 'רמת חן';
UPDATE public.listings SET neighborhood = 'פארק הים'        WHERE neighborhood = 'פארק ים';
UPDATE public.listings SET neighborhood = 'מרכז העיר דרום'  WHERE neighborhood = 'מרכז העיר';
UPDATE public.listings SET neighborhood = 'כוכב הצפון'      WHERE neighborhood = 'צפון העיר';

UPDATE public.sold_properties SET neighborhood = 'רמת חן ובן ציון' WHERE neighborhood = 'רמת חן';
UPDATE public.sold_properties SET neighborhood = 'פארק הים'        WHERE neighborhood = 'פארק ים';
UPDATE public.sold_properties SET neighborhood = 'מרכז העיר דרום'  WHERE neighborhood = 'מרכז העיר';
UPDATE public.sold_properties SET neighborhood = 'כוכב הצפון'      WHERE neighborhood = 'צפון העיר';

UPDATE public.search_profiles
SET neighborhoods = (
  SELECT COALESCE(array_agg(DISTINCT CASE hood
    WHEN 'רמת חן'    THEN 'רמת חן ובן ציון'
    WHEN 'פארק ים'   THEN 'פארק הים'
    WHEN 'מרכז העיר' THEN 'מרכז העיר דרום'
    WHEN 'צפון העיר' THEN 'כוכב הצפון'
    ELSE hood END), '{}')
  FROM unnest(neighborhoods) AS hood
)
WHERE neighborhoods && ARRAY['רמת חן','פארק ים','מרכז העיר','צפון העיר'];

UPDATE public.scout_profiles
SET neighborhoods = (
  SELECT COALESCE(array_agg(DISTINCT CASE hood
    WHEN 'רמת חן'    THEN 'רמת חן ובן ציון'
    WHEN 'פארק ים'   THEN 'פארק הים'
    WHEN 'מרכז העיר' THEN 'מרכז העיר דרום'
    WHEN 'צפון העיר' THEN 'כוכב הצפון'
    ELSE hood END), '{}')
  FROM unnest(neighborhoods) AS hood
)
WHERE neighborhoods && ARRAY['רמת חן','פארק ים','מרכז העיר','צפון העיר'];

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deal_type text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS neighborhoods text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS min_price bigint,
  ADD COLUMN IF NOT EXISTS max_price bigint,
  ADD COLUMN IF NOT EXISTS min_rooms numeric,
  ADD COLUMN IF NOT EXISTS max_rooms numeric,
  ADD COLUMN IF NOT EXISTS min_size integer,
  ADD COLUMN IF NOT EXISTS min_floor integer,
  ADD COLUMN IF NOT EXISTS max_floor integer,
  ADD COLUMN IF NOT EXISTS needs_mamad boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_elevator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_parking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_balcony boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS criteria_extra jsonb;

CREATE INDEX IF NOT EXISTS leads_neighborhoods_gin ON public.leads USING gin (neighborhoods);

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

CREATE TABLE public.listing_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  reaction text NOT NULL CHECK (reaction IN ('interested','not_relevant','favorite','callback')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id, reaction)
);

GRANT SELECT, INSERT, DELETE ON public.listing_feedback TO authenticated;
GRANT ALL ON public.listing_feedback TO service_role;
ALTER TABLE public.listing_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY listing_feedback_own_select ON public.listing_feedback
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY listing_feedback_own_insert ON public.listing_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY listing_feedback_own_delete ON public.listing_feedback
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY listing_feedback_manager_select ON public.listing_feedback
  FOR SELECT TO authenticated
  USING (site_id IS NOT NULL AND (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin')));

CREATE INDEX listing_feedback_user_idx ON public.listing_feedback (user_id, created_at DESC);
CREATE INDEX listing_feedback_site_idx ON public.listing_feedback (site_id, created_at DESC);
CREATE INDEX listing_feedback_lead_idx ON public.listing_feedback (lead_id);

ALTER TABLE public.listing_notifications
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS error text;

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
      AND ld.status NOT IN ('נסגרה עסקה', 'לא רלוונטי', 'לא בשל כרגע')
      AND ld.search_profile_id IS NULL
      AND (ld.email IS NOT NULL OR ld.phone IS NOT NULL)
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

CREATE TABLE public.page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  path text NOT NULL,
  referrer text,
  utm_source text,
  utm_campaign text,
  session_hash text NOT NULL,
  lang text,
  device text,
  is_new_session boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.track_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN
    ('whatsapp_click','phone_click','property_view','lead_submit','login','search','signup')),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  path text,
  session_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.track_events TO service_role;

CREATE INDEX page_views_site_time_idx ON public.page_views (site_id, created_at DESC);
CREATE INDEX page_views_time_idx ON public.page_views (created_at DESC);
CREATE INDEX track_events_site_time_idx ON public.track_events (site_id, created_at DESC);
CREATE INDEX track_events_listing_idx ON public.track_events (listing_id) WHERE listing_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.analytics_overview(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_site_ids uuid[];
  v_result jsonb;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin');
  IF v_is_admin THEN
    SELECT COALESCE(array_agg(id), '{}') INTO v_site_ids FROM public.sites;
  ELSE
    SELECT COALESCE(array_agg(id), '{}') INTO v_site_ids
    FROM public.sites WHERE owner_id = auth.uid();
    IF array_length(v_site_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'views', count(*),
        'sessions', count(DISTINCT session_hash),
        'newSessions', count(*) FILTER (WHERE is_new_session)
      )
      FROM public.page_views
      WHERE created_at BETWEEN p_from AND p_to
        AND (v_is_admin OR site_id = ANY (v_site_ids))
    ),
    'perDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'views', views) ORDER BY day), '[]')
      FROM (
        SELECT date_trunc('day', created_at AT TIME ZONE 'Asia/Jerusalem')::date AS day,
               count(*) AS views
        FROM public.page_views
        WHERE created_at BETWEEN p_from AND p_to
          AND (v_is_admin OR site_id = ANY (v_site_ids))
        GROUP BY 1
      ) d
    ),
    'sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'views', views) ORDER BY views DESC), '[]')
      FROM (
        SELECT COALESCE(NULLIF(utm_source, ''),
                 CASE
                   WHEN referrer IS NULL OR referrer = '' THEN 'ישיר'
                   WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%fb.%' THEN 'Facebook'
                   WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
                   WHEN referrer ILIKE '%google%' THEN 'Google'
                   WHEN referrer ILIKE '%whatsapp%' OR referrer ILIKE '%wa.me%' THEN 'WhatsApp'
                   ELSE 'אחר'
                 END) AS source,
               count(*) AS views
        FROM public.page_views
        WHERE created_at BETWEEN p_from AND p_to
          AND (v_is_admin OR site_id = ANY (v_site_ids))
        GROUP BY 1
        ORDER BY views DESC
        LIMIT 12
      ) src
    ),
    'perSite', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'views')::int DESC), '[]')
      FROM (
        SELECT jsonb_build_object(
          'siteId', s.id,
          'name', s.name,
          'slug', s.slug,
          'views', (SELECT count(*) FROM public.page_views pv
                    WHERE pv.site_id = s.id AND pv.created_at BETWEEN p_from AND p_to),
          'sessions', (SELECT count(DISTINCT pv.session_hash) FROM public.page_views pv
                       WHERE pv.site_id = s.id AND pv.created_at BETWEEN p_from AND p_to),
          'propertyViews', (SELECT count(*) FROM public.track_events te
                            WHERE te.site_id = s.id AND te.type = 'property_view'
                              AND te.created_at BETWEEN p_from AND p_to),
          'whatsappClicks', (SELECT count(*) FROM public.track_events te
                             WHERE te.site_id = s.id AND te.type = 'whatsapp_click'
                               AND te.created_at BETWEEN p_from AND p_to),
          'phoneClicks', (SELECT count(*) FROM public.track_events te
                          WHERE te.site_id = s.id AND te.type = 'phone_click'
                            AND te.created_at BETWEEN p_from AND p_to),
          'leadSubmits', (SELECT count(*) FROM public.track_events te
                          WHERE te.site_id = s.id AND te.type = 'lead_submit'
                            AND te.created_at BETWEEN p_from AND p_to),
          'leads', (SELECT count(*) FROM public.leads ld
                    WHERE ld.site_id = s.id AND ld.created_at BETWEEN p_from AND p_to),
          'signups', (SELECT count(*) FROM public.track_events te
                      WHERE te.site_id = s.id AND te.type = 'signup'
                        AND te.created_at BETWEEN p_from AND p_to)
        ) AS row_data
        FROM public.sites s
        WHERE s.id = ANY (v_site_ids)
      ) sites_data
    ),
    'topListings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'listingId', listing_id, 'title', l.title, 'views', views) ORDER BY views DESC), '[]')
      FROM (
        SELECT te.listing_id, count(*) AS views
        FROM public.track_events te
        WHERE te.type = 'property_view' AND te.listing_id IS NOT NULL
          AND te.created_at BETWEEN p_from AND p_to
        GROUP BY te.listing_id
        ORDER BY views DESC
        LIMIT 10
      ) top
      JOIN public.listings l ON l.id = top.listing_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_overview(timestamptz, timestamptz) TO authenticated;