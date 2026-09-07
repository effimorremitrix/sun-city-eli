-- ============================================================
-- ממליצים כטבלה עם היקף הצגה: 'global' (כל הדפים) או 'sites' (דף אחד או
-- כמה). עד כאן ההמלצות ישבו ב-site_content.testimonials (jsonb לכל דף) —
-- המלצה שהוזנה אצל אלי לא הופיעה אצל הסוכנים. ההמלצות הקיימות מועברות
-- כפי שהן (היקף = הדף שבו נשמרו); המנהל יכול להפוך כל אחת לכללית בלחיצה.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text,                                   -- המזהה הישן מה-jsonb (לתרגומים קיימים)
  name text NOT NULL,
  type text NOT NULL DEFAULT '',                    -- "קניית דירה בעיר ימים"
  quote text NOT NULL,
  media_kind text NOT NULL DEFAULT 'text' CHECK (media_kind IN ('text', 'image', 'video')),
  image_url text,
  video_url text,
  poster_url text,
  scope text NOT NULL DEFAULT 'sites' CHECK (scope IN ('global', 'sites')),
  site_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],   -- רלוונטי כש-scope='sites'
  owner_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,  -- מי הזין (להרשאות סוכן)
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS testimonials_scope_idx ON public.testimonials (scope, is_published, sort_order);
CREATE INDEX IF NOT EXISTS testimonials_sites_gin ON public.testimonials USING gin (site_ids);

GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- ציבורי: מפורסמות בלבד. ניהול: אדמין הכול; סוכן — מה שהוא הזין או שמשויך לדף שלו
DROP POLICY IF EXISTS testimonials_public_select ON public.testimonials;
CREATE POLICY testimonials_public_select ON public.testimonials
  FOR SELECT TO anon, authenticated USING (is_published);
DROP POLICY IF EXISTS testimonials_manage_select ON public.testimonials;
CREATE POLICY testimonials_manage_select ON public.testimonials
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
         OR (owner_site_id IS NOT NULL AND public.owns_site(owner_site_id))
         OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = ANY (site_ids) AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS testimonials_manage_insert ON public.testimonials;
CREATE POLICY testimonials_manage_insert ON public.testimonials
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin')
              OR (scope = 'sites' AND owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)));
DROP POLICY IF EXISTS testimonials_manage_update ON public.testimonials;
CREATE POLICY testimonials_manage_update ON public.testimonials
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)))
  WITH CHECK (public.has_role(auth.uid(), 'admin')
              OR (scope = 'sites' AND owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)));
DROP POLICY IF EXISTS testimonials_manage_delete ON public.testimonials;
CREATE POLICY testimonials_manage_delete ON public.testimonials
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)));

CREATE TRIGGER testimonials_set_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- העברת ההמלצות הקיימות מה-jsonb — לכל דף, בהיקף "הדף הזה בלבד"
INSERT INTO public.testimonials
  (legacy_id, name, type, quote, media_kind, image_url, video_url, poster_url, scope, site_ids, owner_site_id, sort_order, translations)
SELECT
  t->>'id',
  COALESCE(t->>'name', ''),
  COALESCE(t->>'type', ''),
  COALESCE(t->>'quote', ''),
  CASE
    WHEN t->>'mediaKind' IN ('text', 'image', 'video') THEN t->>'mediaKind'
    WHEN NULLIF(t->>'videoUrl', '') IS NOT NULL THEN 'video'
    WHEN NULLIF(t->>'imageUrl', '') IS NOT NULL THEN 'image'
    ELSE 'text'
  END,
  NULLIF(t->>'imageUrl', ''),
  NULLIF(t->>'videoUrl', ''),
  NULLIF(t->>'posterUrl', ''),
  'sites',
  ARRAY[c.site_id],
  c.site_id,
  ord - 1,
  -- תרגומים קיימים של הממליץ (site_content.translations[lang].testimonials[id])
  COALESCE((
    SELECT jsonb_object_agg(lang, COALESCE(c.translations->lang->'testimonials'->(t->>'id'), '{}'::jsonb))
    FROM (VALUES ('en'), ('fr'), ('ru')) AS langs(lang)
    WHERE c.translations->lang->'testimonials' ? (t->>'id')
  ), '{}'::jsonb)
FROM public.site_content c,
     LATERAL jsonb_array_elements(COALESCE(c.testimonials, '[]'::jsonb)) WITH ORDINALITY AS x(t, ord)
WHERE jsonb_typeof(c.testimonials) = 'array'
  AND COALESCE(t->>'quote', '') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.testimonials e WHERE e.legacy_id = t->>'id' AND e.owner_site_id = c.site_id);

-- הממליצים הציבוריים של דף: כלליים + המשויכים לדף, לפי סדר
CREATE OR REPLACE FUNCTION public.get_public_testimonials(p_site_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'name', t.name, 'type', t.type, 'quote', t.quote,
    'mediaKind', t.media_kind, 'imageUrl', t.image_url, 'videoUrl', t.video_url, 'posterUrl', t.poster_url,
    'scope', t.scope, 'translations', t.translations, 'updatedAt', t.updated_at
  ) ORDER BY t.sort_order, t.created_at), '[]'::jsonb)
  FROM public.testimonials t
  WHERE t.is_published
    AND (t.scope = 'global' OR (p_site_id IS NOT NULL AND p_site_id = ANY (t.site_ids)))
$$;
GRANT EXECUTE ON FUNCTION public.get_public_testimonials(uuid) TO anon, authenticated;
