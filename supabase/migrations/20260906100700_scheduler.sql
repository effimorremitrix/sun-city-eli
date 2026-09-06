-- ============================================================
-- מתזמן פנימי: pg_cron + pg_net קוראים לנקודות הקצה /api/public/jobs/<name>
-- של האתר עם הסוד מ-app_settings. אין תלות בשירות חיצוני ואין משתני
-- סביבה חדשים. אם ההרחבות אינן זמינות בסביבה — המיגרציה עוברת בשקט,
-- וטאב "מערכת" מציג שהמתזמן לא זמין ומה לעשות.
-- ============================================================

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

-- קריאה אסינכרונית לנקודת קצה של משימה (plpgsql — נבדק רק בזמן ריצה, ולכן
-- הפונקציה נוצרת גם כשאין net.*)
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobname FROM cron.job WHERE jobname LIKE 'suncity-%' LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;
  -- זמני UTC (ישראל = UTC+2/+3). סריקת שוק: כל 10 דקות בין 00:00 ל-04:59 UTC,
  -- כל ריצה מטפלת בכמה משימות ומסיימת מהר; ריצה בלי משימות יוצאת מיד.
  PERFORM cron.schedule('suncity-market-scan',    '*/10 0-4 * * *', $c$SELECT public.run_scheduled_job('market-scan')$c$);
  PERFORM cron.schedule('suncity-scout',          '0 4 * * *',      $c$SELECT public.run_scheduled_job('scout')$c$);
  PERFORM cron.schedule('suncity-match-profiles', '10 5 * * *',     $c$SELECT public.run_scheduled_job('match-profiles')$c$);
  PERFORM cron.schedule('suncity-notify-pending', '20,50 5-19 * * *', $c$SELECT public.run_scheduled_job('notify-pending')$c$);
  PERFORM cron.schedule('suncity-backup',         '30 23 * * *',    $c$SELECT public.run_scheduled_job('backup')$c$);
  PERFORM cron.schedule('suncity-health-check',   '15 * * * *',     $c$SELECT public.run_scheduled_job('health-check')$c$);
  PERFORM cron.schedule('suncity-prune',          '45 2 * * 0',     $c$SELECT public.prune_activity_log()$c$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;

-- מצב המתזמן לטאב "מערכת": האם pg_cron זמין ומה המשימות (אדמין בלבד)
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
