-- ============================================================
-- יומן פעילות מערכתי: כל חיפוש, התאמה, שליחה (מייל/וואטסאפ), תגובת לקוח,
-- התראה לסוכן וריצת מתזמן — במקום אחד, עם סטטוס ושגיאה. עונה על
-- "למה הלקוח/הסוכן לא קיבל התראה" בלי לנחש.
-- ============================================================

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
  recipient text,                 -- ממוסך (4 ספרות אחרונות / דומיין) — לא מלא
  message text,                   -- תיאור קריא בעברית
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

-- ריצות המתזמן — כדי שטאב "מערכת" יראה מה רץ, מתי ומה קרה
CREATE TABLE IF NOT EXISTS public.job_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed', 'skipped')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  trigger text                    -- 'cron' / 'manual'
);
CREATE INDEX IF NOT EXISTS job_runs_job_time_idx ON public.job_runs (job, started_at DESC);
GRANT SELECT ON public.job_runs TO authenticated;
GRANT ALL ON public.job_runs TO service_role;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_runs_admin_select ON public.job_runs;
CREATE POLICY job_runs_admin_select ON public.job_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

