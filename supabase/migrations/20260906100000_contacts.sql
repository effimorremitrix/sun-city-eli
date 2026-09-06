-- ============================================================
-- לקוח אחד (contact): ישות גלובלית לפי טלפון מנורמל (ומייל כגיבוי).
--
-- עד כאן "ליד" היה שורה לכל (סוכן × טלפון): אותו אדם אצל שני סוכנים =
-- שני כרטיסים, ובלי שיוך קבוע. מעכשיו כל ליד/פרופיל חיפוש/משוב/התראה
-- מצביע על contact אחד, והסוכן המטפל נשמר על ה-contact (מגע ראשון מנצח,
-- מנהל יכול לשנות).
--
-- הנתונים הקיימים לא משתנים: לידים קיימים רק מקבלים contact_id (נוצר
-- contact לכל טלפון מנורמל ייחודי; הליד הראשון בזמן קובע את הסוכן).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text,
  email text,
  full_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- הסוכן המטפל הקבוע (sites.id). NULL = טרם שויך (נופל למשרד בקוד)
  assigned_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  -- ייחוס מגע ראשון — נקבע פעם אחת ולא נדרס
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

-- ---- קישורים מהטבלאות הקיימות ----
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
-- ליד פתוח אחד לכל לקוח (לשורות חדשות; כפילויות קיימות נשארות ומסומנות ב-UI)
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

-- ---- הרשאות: מנהל של אתר רואה לקוחות שיש להם ליד/פרופיל אצלו; אדמין רואה הכול ----
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

-- ---- Backfill לא-הרסני: contact לכל טלפון מנורמל ייחודי, לפי הליד הראשון ----
INSERT INTO public.contacts (phone_normalized, email, full_name, user_id, assigned_site_id,
                             assigned_at, first_source, first_site_id, marketing_consent, consent_at, created_at)
SELECT DISTINCT ON (l.phone_normalized)
       l.phone_normalized, l.email, l.full_name,
       -- user_id ייחודי: נקשר רק אם אין contact אחר עם אותו משתמש
       CASE WHEN l.user_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM public.contacts c2 WHERE c2.user_id = l.user_id)
            THEN l.user_id END,
       l.site_id, l.created_at, l.source, l.site_id, l.marketing_consent, l.consent_at, l.created_at
FROM public.leads l
WHERE l.phone_normalized IS NOT NULL AND l.phone_normalized <> ''
ORDER BY l.phone_normalized, l.created_at ASC
ON CONFLICT DO NOTHING;

-- לידים בלי טלפון אבל עם משתמש רשום — contact לפי המשתמש
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

-- משתמשים רשומים עם פרופיל חיפוש ובלי ליד — גם הם לקוחות
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
