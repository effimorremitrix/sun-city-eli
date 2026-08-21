-- מודול לידים ו-Follow-up: כרטיס ליד לכל לקוח/פנייה, ציר זמן (Timeline) לכל ליד,
-- ומשימת Follow-up אחת פעילה על כל כרטיס (next_action + next_follow_up_at).
--
-- עקרונות:
-- * שיוך לסוכן דרך site_id — כך בורר הסוכנים הקיים ("אני צופה כ־") ו-owns_site()
--   עובדים כמו בשאר המערכת: סוכן רואה רק את הלידים של האתר שלו, אדמין את כולם.
-- * status ו-source הם text עם ולידציה אפליקטיבית (כמו scout_candidates.status) —
--   הוספת סטטוס בעתיד היא שינוי קוד, לא מיגרציית enum.
-- * ה-Follow-up מודל כשדות על הליד (משימה פעילה אחת לכל ליד, לפי האפיון);
--   ההיסטוריה המלאה נשמרת ב-lead_events. טבלת משימות מרובות תוכל להתווסף בעתיד.
-- * עמודות reminder_*_sent_at הן Outbox לעתיד (תזכורות אוטומטיות במייל/WhatsApp,
--   בדפוס של listing_notifications.email_sent_at) — לא נשלח מהן דבר כרגע.

-- 1. טבלת הלידים — "כרטיס הלקוח"
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,      -- הסוכן המטפל
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,                -- לקוח רשום (אם קיים)
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,        -- הנכס שבגללו פנה (אם קיים)
  search_profile_id uuid REFERENCES public.search_profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  phone_normalized text,          -- ספרות בלבד בפורמט 972... — מחושב באפליקציה, לדדופ
  email text,
  source text NOT NULL DEFAULT 'ידני',       -- מתוך LEAD_SOURCES (src/lib/leads.ts)
  status text NOT NULL DEFAULT 'ליד חדש',    -- מתוך LEAD_STATUSES (src/lib/leads.ts)
  notes text,
  next_action text,                           -- "הפעולה הבאה" — טקסט חופשי
  next_follow_up_at timestamptz,              -- מועד ה-Follow-up הבא
  reminder_email_sent_at timestamptz,         -- Outbox לעתיד — מתאפס כשמועד ה-Follow-up משתנה
  reminder_whatsapp_sent_at timestamptz,
  score integer,                              -- שמור לעתיד: דירוג לידים
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = נקלט אוטומטית מהאתר
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_site_status_idx ON public.leads(site_id, status);
CREATE INDEX leads_site_follow_up_idx ON public.leads(site_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX leads_site_phone_idx ON public.leads(site_id, phone_normalized);
CREATE INDEX leads_user_idx ON public.leads(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- owns_site מודע-אדמין (אדמין תמיד עובר) — אין צורך בסעיף אדמין נפרד
CREATE POLICY leads_manager_select ON public.leads
  FOR SELECT TO authenticated USING (public.owns_site(site_id));
CREATE POLICY leads_manager_insert ON public.leads
  FOR INSERT TO authenticated WITH CHECK (public.owns_site(site_id));
CREATE POLICY leads_manager_update ON public.leads
  FOR UPDATE TO authenticated USING (public.owns_site(site_id)) WITH CHECK (public.owns_site(site_id));
CREATE POLICY leads_manager_delete ON public.leads
  FOR DELETE TO authenticated USING (public.owns_site(site_id));

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. ציר הזמן — יומן אירועים חסין (append-only): אין UPDATE/DELETE גם לא דרך ה-UI
CREATE TABLE public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,  -- דנורמליזציה ל-RLS ולדוחות
  event_type text NOT NULL,      -- מתוך LEAD_EVENT_TYPES (src/lib/leads.ts)
  note text,                     -- הטקסט שמוצג בציר הזמן
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,   -- למשל {from_status, to_status, response}
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = מערכת/אתר/לקוח
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_events_lead_idx ON public.lead_events(lead_id, created_at DESC);
CREATE INDEX lead_events_site_idx ON public.lead_events(site_id, created_at DESC);

GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_events_manager_select ON public.lead_events
  FOR SELECT TO authenticated USING (public.owns_site(site_id));
CREATE POLICY lead_events_manager_insert ON public.lead_events
  FOR INSERT TO authenticated WITH CHECK (public.owns_site(site_id));

-- 3. תגובת לקוח על התראת נכס מהסוכן האישי ("מעניין אותי" / "רוצה לראות" / "דברו איתי").
--    התגובה נכתבת דרך server fn (service role); ללקוח אין צורך במדיניות חדשה.
ALTER TABLE public.listing_notifications
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS response_at timestamptz,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;