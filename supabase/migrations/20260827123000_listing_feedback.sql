-- ============================================================
-- משוב לקוח על נכסים: ❤️ מעניין אותי / ❌ לא מתאים לי / ⭐ שמור /
-- 📞 רוצה שסוכן יחזור אליי. נשמר פר לקוח+נכס, מוצג לסוכן בכרטיס הליד,
-- ובעתיד ישמש גם לשיפור ההתאמות.
-- ============================================================

CREATE TABLE public.listing_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- הסוכן המטפל (site של הנכס בזמן המשוב) — לסינון בלוח הניהול
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  reaction text NOT NULL CHECK (reaction IN ('interested','not_relevant','favorite','callback')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id, reaction)
);

GRANT SELECT, INSERT, DELETE ON public.listing_feedback TO authenticated;
GRANT ALL ON public.listing_feedback TO service_role;
ALTER TABLE public.listing_feedback ENABLE ROW LEVEL SECURITY;

-- הלקוח רואה ומנהל רק את המשוב של עצמו
CREATE POLICY listing_feedback_own_select ON public.listing_feedback
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY listing_feedback_own_insert ON public.listing_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY listing_feedback_own_delete ON public.listing_feedback
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- הסוכן המטפל (או אדמין) רואה את המשוב של הלקוחות על נכסי האתר שלו
CREATE POLICY listing_feedback_manager_select ON public.listing_feedback
  FOR SELECT TO authenticated
  USING (site_id IS NOT NULL AND (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin')));

CREATE INDEX listing_feedback_user_idx ON public.listing_feedback (user_id, created_at DESC);
CREATE INDEX listing_feedback_site_idx ON public.listing_feedback (site_id, created_at DESC);
CREATE INDEX listing_feedback_lead_idx ON public.listing_feedback (lead_id);
