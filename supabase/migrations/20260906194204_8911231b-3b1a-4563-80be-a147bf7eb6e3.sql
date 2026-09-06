CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text,
  email text,
  full_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  first_source text,
  first_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  first_utm_source text,
  first_utm_campaign text,
  first_utm_content text,
  first_referrer text,
  first_landing_path text,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_phone_unique
  ON public.contacts (phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_unique
  ON public.contacts (lower(email)) WHERE email IS NOT NULL AND phone_normalized IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_unique
  ON public.contacts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_assigned_site_idx ON public.contacts (assigned_site_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON public.contacts (lower(email));

GRANT SELECT ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER contacts_set_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_path text,
  ADD COLUMN IF NOT EXISTS session_hash text,
  ADD COLUMN IF NOT EXISTS reassigned_from_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_contact_idx ON public.leads (contact_id) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leads_contact_open_unique
  ON public.leads (contact_id)
  WHERE contact_id IS NOT NULL
    AND status NOT IN ('נסגרה עסקה', 'לא רלוונטי')
    AND created_at >= '2026-09-06'::timestamptz;

ALTER TABLE public.search_profiles
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS search_profiles_contact_idx ON public.search_profiles (contact_id);

ALTER TABLE public.listing_feedback
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.listing_notifications
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.can_view_contact(_contact_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = _contact_id
        AND (c.user_id = auth.uid()
             OR (c.assigned_site_id IS NOT NULL AND public.owns_site(c.assigned_site_id)))
    )
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.contact_id = _contact_id AND public.owns_site(l.site_id)
    )
$$;

DROP POLICY IF EXISTS contacts_manager_select ON public.contacts;
CREATE POLICY contacts_manager_select ON public.contacts
  FOR SELECT TO authenticated USING (public.can_view_contact(id));

INSERT INTO public.contacts (phone_normalized, email, full_name, user_id, assigned_site_id,
                             assigned_at, first_source, first_site_id, marketing_consent, consent_at, created_at)
SELECT DISTINCT ON (l.phone_normalized)
       l.phone_normalized, l.email, l.full_name,
       CASE WHEN l.user_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM public.contacts c2 WHERE c2.user_id = l.user_id)
            THEN l.user_id END,
       l.site_id, l.created_at, l.source, l.site_id, l.marketing_consent, l.consent_at, l.created_at
FROM public.leads l
WHERE l.phone_normalized IS NOT NULL AND l.phone_normalized <> ''
ORDER BY l.phone_normalized, l.created_at ASC
ON CONFLICT DO NOTHING;

INSERT INTO public.contacts (email, full_name, user_id, assigned_site_id, assigned_at,
                             first_source, first_site_id, marketing_consent, consent_at, created_at)
SELECT DISTINCT ON (l.user_id)
       l.email, l.full_name, l.user_id, l.site_id, l.created_at, l.source, l.site_id,
       l.marketing_consent, l.consent_at, l.created_at
FROM public.leads l
WHERE l.user_id IS NOT NULL
  AND (l.phone_normalized IS NULL OR l.phone_normalized = '')
  AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.user_id = l.user_id)
ORDER BY l.user_id, l.created_at ASC
ON CONFLICT DO NOTHING;

UPDATE public.leads l
SET contact_id = c.id
FROM public.contacts c
WHERE l.contact_id IS NULL
  AND l.phone_normalized IS NOT NULL AND l.phone_normalized <> ''
  AND c.phone_normalized = l.phone_normalized;

UPDATE public.leads l
SET contact_id = c.id
FROM public.contacts c
WHERE l.contact_id IS NULL AND l.user_id IS NOT NULL AND c.user_id = l.user_id;

INSERT INTO public.contacts (email, full_name, user_id, marketing_consent, consent_at, first_source, created_at)
SELECT DISTINCT ON (p.id) p.email, p.full_name, p.id, p.marketing_consent, p.consent_at, 'הרשמה לאתר', p.created_at
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.search_profiles sp WHERE sp.user_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.user_id = p.id)
ORDER BY p.id
ON CONFLICT DO NOTHING;

UPDATE public.search_profiles sp
SET contact_id = c.id
FROM public.contacts c
WHERE sp.contact_id IS NULL AND c.user_id = sp.user_id;

UPDATE public.listing_feedback f
SET contact_id = c.id
FROM public.contacts c
WHERE f.contact_id IS NULL AND c.user_id = f.user_id;

UPDATE public.listing_notifications n
SET contact_id = c.id
FROM public.contacts c
WHERE n.contact_id IS NULL AND n.user_id IS NOT NULL AND c.user_id = n.user_id;

UPDATE public.listing_notifications n
SET contact_id = l.contact_id
FROM public.leads l
WHERE n.contact_id IS NULL AND n.lead_id IS NOT NULL AND l.id = n.lead_id AND l.contact_id IS NOT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS notify_whatsapp text;

UPDATE public.sites s
SET notify_email = COALESCE(NULLIF(c.business->>'email', ''), p.email),
    notify_whatsapp = NULLIF(COALESCE(c.business->>'phoneTel', c.business->>'phone'), '')
FROM public.site_content c, public.profiles p
WHERE c.site_id = s.id AND p.id = s.owner_id
  AND s.notify_email IS NULL AND s.notify_whatsapp IS NULL;

CREATE TABLE IF NOT EXISTS public.market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_site text,
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
  is_active boolean NOT NULL DEFAULT true,
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

CREATE TABLE IF NOT EXISTS public.market_scan_tasks (
  key text PRIMARY KEY,
  deal_type text NOT NULL,
  neighborhood text NOT NULL,
  demand integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz,
  last_found integer,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.market_scan_tasks TO service_role;
ALTER TABLE public.market_scan_tasks ENABLE ROW LEVEL SECURITY;

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

  v_inserted := v_inserted + public.match_market_listings(now() - interval '30 days', p_profile_id);
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_profile_to_listings(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('client', 'agent', 'admin', 'notification', 'ai', 'job', 'system', 'security')),
  event text NOT NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  market_listing_id uuid REFERENCES public.market_listings(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text CHECK (channel IS NULL OR channel IN ('email', 'whatsapp', 'sms', 'inapp')),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed', 'skipped', 'blocked')),
  recipient text,
  message text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_time_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_site_time_idx ON public.activity_log (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_contact_idx ON public.activity_log (contact_id, created_at DESC) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_log_failed_idx ON public.activity_log (created_at DESC) WHERE status = 'failed';

GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_log_manager_select ON public.activity_log;
CREATE POLICY activity_log_manager_select ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (site_id IS NOT NULL AND public.owns_site(site_id)));

CREATE TABLE IF NOT EXISTS public.job_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed', 'skipped')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  trigger text
);
CREATE INDEX IF NOT EXISTS job_runs_job_time_idx ON public.job_runs (job, started_at DESC);
GRANT SELECT ON public.job_runs TO authenticated;
GRANT ALL ON public.job_runs TO service_role;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_runs_admin_select ON public.job_runs;
CREATE POLICY job_runs_admin_select ON public.job_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (id, data)
VALUES (1, jsonb_build_object(
  'site_url', 'https://sun-city-eli.lovable.app',
  'cron_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'ai_search_enabled', true,
  'ai_search_anon_daily', 5,
  'ai_search_user_daily', 20,
  'ai_search_burst_per_minute', 6,
  'ai_daily_usd_cap', 5,
  'ai_model', 'claude-sonnet-4-5',
  'web_search_user_daily', 5,
  'market_scan_enabled', true,
  'market_scan_llm_sources_enabled', false,
  'market_scan_tasks_per_run', 6,
  'market_listing_ttl_days', 14,
  'leads_per_minute', 5,
  'signup_per_hour', 3,
  'feedback_per_minute', 20,
  'track_per_minute', 120,
  'auto_block_multiplier', 3,
  'auto_block_hours', 24,
  'backup_retention_days', 30,
  'health_alerts_enabled', true
))
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.blocked_keys (
  key text PRIMARY KEY,
  reason text,
  until timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.blocked_keys TO service_role;
ALTER TABLE public.blocked_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text, p_limit integer, p_window_seconds integer, p_cost integer DEFAULT 1
)
RETURNS TABLE (allowed boolean, remaining integer, current_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.rate_limits AS r (key, window_start, count)
  VALUES (p_key, v_window, p_cost)
  ON CONFLICT (key, window_start) DO UPDATE SET count = r.count + EXCLUDED.count
  RETURNING r.count INTO v_count;
  RETURN QUERY SELECT v_count <= p_limit, GREATEST(0, p_limit - v_count), v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.prune_activity_log()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.activity_log WHERE created_at < now() - interval '180 days';
  DELETE FROM public.job_runs WHERE started_at < now() - interval '90 days';
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
  DELETE FROM public.blocked_keys WHERE until < now() - interval '7 days';
$$;

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

ALTER TABLE public.sold_properties
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net unavailable: %', SQLERRM;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.run_scheduled_job(p_job text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_id bigint;
BEGIN
  SELECT data->>'site_url', data->>'cron_secret' INTO v_url, v_secret
  FROM public.app_settings WHERE id = 1;
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT net.http_post(
    url := rtrim(v_url, '/') || '/api/public/jobs/' || p_job,
    body := jsonb_build_object('trigger', 'cron'),
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 120000
  ) INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.scheduler_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jobs jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
      'lastStatus', (SELECT d.status FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1),
      'lastRun', (SELECT d.start_time FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1)
    ) ORDER BY j.jobname), '[]'::jsonb)
    INTO v_jobs
    FROM cron.job j WHERE j.jobname LIKE 'suncity-%';
    RETURN jsonb_build_object('available', true, 'jobs', v_jobs);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('available', false, 'error', SQLERRM, 'jobs', '[]'::jsonb);
  END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.scheduler_status() TO authenticated;