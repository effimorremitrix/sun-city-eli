-- ============================================================
-- שלב 3: CRM בסיסי. הפייפליין הוא של הסוכן — כל סוכן מנהל את הלידים
-- והמשימות של הדף שלו (RLS דרך owns_site), והמנהל הראשי רואה את הכול
-- מלמעלה בלוח הצוות.
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

COMMENT ON COLUMN public.leads.assigned_user_id IS 'העובד האחראי לליד בתוך הדף. ברירת מחדל: בעל הדף. אינו גבול הרשאות — RLS נשאר לפי site_id.';
COMMENT ON COLUMN public.leads.deal_value IS 'ערך העסקה בשקלים (מחיר הנכס או העמלה, לפי החלטת המשרד).';
COMMENT ON COLUMN public.leads.lost_reason IS 'סיבת אובדן כשהסטטוס הוא "לא רלוונטי". רשימת הערכים היא בקוד (src/lib/crm.ts).';

UPDATE public.leads l
   SET assigned_user_id = s.owner_id
  FROM public.sites s
 WHERE s.id = l.site_id AND l.assigned_user_id IS NULL;

UPDATE public.leads
   SET closed_at = updated_at
 WHERE closed_at IS NULL AND status IN ('נסגרה עסקה', 'לא רלוונטי');

CREATE INDEX IF NOT EXISTS leads_assigned_user_idx
  ON public.leads(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_closed_at_idx
  ON public.leads(closed_at) WHERE closed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.leads_crm_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('נסגרה עסקה', 'לא רלוונטי') THEN
    IF NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  ELSE
    NEW.closed_at := NULL;
    NEW.lost_reason := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_user_id IS NULL THEN
      SELECT owner_id INTO NEW.assigned_user_id FROM public.sites WHERE id = NEW.site_id;
    END IF;
  ELSIF NEW.site_id IS DISTINCT FROM OLD.site_id THEN
    SELECT owner_id INTO NEW.assigned_user_id FROM public.sites WHERE id = NEW.site_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_closed_at ON public.leads;
DROP TRIGGER IF EXISTS leads_crm_defaults_trg ON public.leads;
CREATE TRIGGER leads_crm_defaults_trg BEFORE INSERT OR UPDATE OF status, site_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_crm_defaults();

CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'אחר',
  notes text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'פתוחה',
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reminder_email_sent_at timestamptz,
  reminder_whatsapp_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_tasks_status_check CHECK (status IN ('פתוחה', 'הושלמה', 'בוטלה'))
);

CREATE INDEX IF NOT EXISTS lead_tasks_lead_idx ON public.lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS lead_tasks_site_due_idx ON public.lead_tasks(site_id, status, due_at);
CREATE INDEX IF NOT EXISTS lead_tasks_assigned_idx
  ON public.lead_tasks(assigned_user_id, status) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_tasks_reminder_idx
  ON public.lead_tasks(due_at) WHERE status = 'פתוחה' AND reminder_email_sent_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tasks TO authenticated;
GRANT ALL ON public.lead_tasks TO service_role;
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_tasks_manager_select ON public.lead_tasks;
DROP POLICY IF EXISTS lead_tasks_manager_insert ON public.lead_tasks;
DROP POLICY IF EXISTS lead_tasks_manager_update ON public.lead_tasks;
DROP POLICY IF EXISTS lead_tasks_manager_delete ON public.lead_tasks;
CREATE POLICY lead_tasks_manager_select ON public.lead_tasks
  FOR SELECT TO authenticated USING (public.owns_site(site_id));
CREATE POLICY lead_tasks_manager_insert ON public.lead_tasks
  FOR INSERT TO authenticated WITH CHECK (public.owns_site(site_id));
CREATE POLICY lead_tasks_manager_update ON public.lead_tasks
  FOR UPDATE TO authenticated USING (public.owns_site(site_id)) WITH CHECK (public.owns_site(site_id));
CREATE POLICY lead_tasks_manager_delete ON public.lead_tasks
  FOR DELETE TO authenticated USING (public.owns_site(site_id));

DROP TRIGGER IF EXISTS lead_tasks_set_updated_at ON public.lead_tasks;
CREATE TRIGGER lead_tasks_set_updated_at BEFORE UPDATE ON public.lead_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.lead_tasks_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'הושלמה' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'הושלמה' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.due_at IS DISTINCT FROM OLD.due_at THEN
    NEW.reminder_email_sent_at := NULL;
    NEW.reminder_whatsapp_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_tasks_sync_trg ON public.lead_tasks;
CREATE TRIGGER lead_tasks_sync_trg BEFORE INSERT OR UPDATE ON public.lead_tasks
  FOR EACH ROW EXECUTE FUNCTION public.lead_tasks_sync();

CREATE OR REPLACE FUNCTION public.lead_tasks_follow_lead_site()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_id IS DISTINCT FROM OLD.site_id THEN
    UPDATE public.lead_tasks
       SET site_id = NEW.site_id,
           assigned_user_id = (SELECT owner_id FROM public.sites WHERE id = NEW.site_id)
     WHERE lead_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_move_tasks ON public.leads;
CREATE TRIGGER leads_move_tasks AFTER UPDATE OF site_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.lead_tasks_follow_lead_site();

CREATE OR REPLACE FUNCTION public.sync_lead_next_task(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due timestamptz;
  v_title text;
  v_has_tasks boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.lead_tasks WHERE lead_id = p_lead_id) INTO v_has_tasks;
  IF NOT v_has_tasks THEN RETURN; END IF;

  SELECT due_at, title INTO v_due, v_title
    FROM public.lead_tasks
   WHERE lead_id = p_lead_id AND status = 'פתוחה' AND due_at IS NOT NULL
   ORDER BY due_at ASC
   LIMIT 1;

  UPDATE public.leads
     SET next_follow_up_at = v_due,
         next_action = v_title,
         reminder_email_sent_at = CASE WHEN next_follow_up_at IS DISTINCT FROM v_due THEN NULL ELSE reminder_email_sent_at END,
         reminder_whatsapp_sent_at = CASE WHEN next_follow_up_at IS DISTINCT FROM v_due THEN NULL ELSE reminder_whatsapp_sent_at END
   WHERE id = p_lead_id
     AND (next_follow_up_at IS DISTINCT FROM v_due OR next_action IS DISTINCT FROM v_title);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_lead_next_task(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.lead_tasks_touch_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_lead_next_task(OLD.lead_id);
  ELSE
    PERFORM public.sync_lead_next_task(NEW.lead_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS lead_tasks_touch_lead_trg ON public.lead_tasks;
CREATE TRIGGER lead_tasks_touch_lead_trg AFTER INSERT OR UPDATE OR DELETE ON public.lead_tasks
  FOR EACH ROW EXECUTE FUNCTION public.lead_tasks_touch_lead();

CREATE OR REPLACE FUNCTION public.crm_pipeline_board(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_site_ids uuid[];
  v_stale timestamptz := now() - interval '14 days';
  v_result jsonb;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin');
  IF v_is_admin THEN
    SELECT COALESCE(array_agg(id), '{}') INTO v_site_ids FROM public.sites;
  ELSE
    SELECT COALESCE(array_agg(id), '{}') INTO v_site_ids FROM public.sites WHERE owner_id = auth.uid();
    IF array_length(v_site_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'isAdmin', v_is_admin,

    'perSite', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'openLeads')::int DESC), '[]')
      FROM (
        SELECT jsonb_build_object(
          'siteId', s.id,
          'name', s.name,
          'slug', s.slug,
          'openLeads',   (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.closed_at IS NULL),
          'newLeads',    (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status = 'ליד חדש'),
          'untouched',   (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status = 'ליד חדש' AND ld.next_follow_up_at IS NULL),
          'stale',       (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.closed_at IS NULL AND ld.updated_at < v_stale),
          'tours',       (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status IN ('נקבע סיור', 'בוצע סיור')),
          'negotiation', (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status = 'מו"מ'),
          'openTasks',   (SELECT count(*) FROM public.lead_tasks t WHERE t.site_id = s.id AND t.status = 'פתוחה'),
          'overdueTasks',(SELECT count(*) FROM public.lead_tasks t WHERE t.site_id = s.id AND t.status = 'פתוחה' AND t.due_at < now()),
          'dueToday',    (SELECT count(*) FROM public.lead_tasks t WHERE t.site_id = s.id AND t.status = 'פתוחה'
                            AND t.due_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Jerusalem') AT TIME ZONE 'Asia/Jerusalem'
                            AND t.due_at <  (date_trunc('day', now() AT TIME ZONE 'Asia/Jerusalem') + interval '1 day') AT TIME ZONE 'Asia/Jerusalem'),
          'deals',       (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status = 'נסגרה עסקה' AND ld.closed_at BETWEEN p_from AND p_to),
          'dealValue',   (SELECT COALESCE(sum(ld.deal_value), 0) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status = 'נסגרה עסקה' AND ld.closed_at BETWEEN p_from AND p_to),
          'lost',        (SELECT count(*) FROM public.leads ld WHERE ld.site_id = s.id AND ld.status = 'לא רלוונטי' AND ld.closed_at BETWEEN p_from AND p_to),
          'lastActivityAt', (SELECT max(le.created_at) FROM public.lead_events le WHERE le.site_id = s.id)
        ) AS row_data
        FROM public.sites s
        WHERE s.id = ANY (v_site_ids)
      ) x
    ),

    'byStatus', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', cnt, 'value', val) ORDER BY cnt DESC), '[]')
      FROM (
        SELECT ld.status, count(*) AS cnt, COALESCE(sum(ld.deal_value), 0) AS val
        FROM public.leads ld
        WHERE ld.site_id = ANY (v_site_ids)
        GROUP BY 1
      ) st
    ),

    'lostReasons', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('reason', reason, 'count', cnt) ORDER BY cnt DESC), '[]')
      FROM (
        SELECT COALESCE(NULLIF(ld.lost_reason, ''), 'לא צוינה סיבה') AS reason, count(*) AS cnt
        FROM public.leads ld
        WHERE ld.site_id = ANY (v_site_ids) AND ld.status = 'לא רלוונטי'
          AND ld.closed_at BETWEEN p_from AND p_to
        GROUP BY 1
      ) lr
    ),

    'closedDeals', (
      SELECT COALESCE(jsonb_agg(row_data), '[]')
      FROM (
        SELECT jsonb_build_object(
                 'leadId', ld.id, 'name', ld.full_name, 'siteId', ld.site_id, 'siteName', s.name,
                 'dealValue', ld.deal_value, 'closedAt', ld.closed_at) AS row_data
        FROM public.leads ld
        JOIN public.sites s ON s.id = ld.site_id
        WHERE ld.site_id = ANY (v_site_ids) AND ld.status = 'נסגרה עסקה'
          AND ld.closed_at BETWEEN p_from AND p_to
        ORDER BY COALESCE(ld.deal_value, 0) DESC
        LIMIT 50
      ) d
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.crm_pipeline_board(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.assignable_site_users(p_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.owns_site(p_site_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', u.id,
           'name', COALESCE(NULLIF(p.full_name, ''), p.email, 'משתמש'),
           'email', p.email,
           'isOwner', u.is_owner
         ) ORDER BY u.is_owner DESC, p.full_name NULLS LAST), '[]')
    INTO v_result
  FROM (
    SELECT s.owner_id AS id, true AS is_owner FROM public.sites s WHERE s.id = p_site_id
    UNION
    SELECT ur.user_id, false FROM public.user_roles ur
     WHERE ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
       AND ur.user_id <> (SELECT owner_id FROM public.sites WHERE id = p_site_id)
  ) u
  LEFT JOIN public.profiles p ON p.id = u.id;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.assignable_site_users(uuid) TO authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('suncity-follow-up-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.schedule(
    'suncity-follow-up-reminders',
    '0,30 6-17 * * *',
    $c$SELECT public.run_scheduled_job('follow-up-reminders')$c$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;