-- ============================================================
-- הגדרות מערכת (שורה אחת), מגבלות קצב מבוססות DB (שורדות ב-Cloudflare
-- Workers, בניגוד ל-Map בזיכרון), וחסימות של מפתחות חריגים.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ברירות המחדל — ניתנות לשינוי בטאב "הגדרות" של המנהל הראשי.
-- cron_secret נוצר כאן פעם אחת ומשמש את המתזמן הפנימי (pg_cron → /api/public/jobs).
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

-- ספירה אטומית בחלון: מחזירה allowed + כמה נשאר. p_cost מאפשר לחייב יותר מ-1.
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

-- ניקוי: היומן נשמר 180 יום, ריצות 90 יום, חלונות קצב יומיים (מופעל מהמתזמן)
CREATE OR REPLACE FUNCTION public.prune_activity_log()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.activity_log WHERE created_at < now() - interval '180 days';
  DELETE FROM public.job_runs WHERE started_at < now() - interval '90 days';
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
  DELETE FROM public.blocked_keys WHERE until < now() - interval '7 days';
$$;
