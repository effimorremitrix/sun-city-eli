-- ============================================================
-- "מהשטח": סרטונים (ותמונות) מעסקאות — חתימות, מסירת מפתחות, לקוחות
-- מרוצים, רגעים מהמשרד. אותו מודל היקף כמו הממליצים: כללי או לדפים
-- מסוימים; מנוהל מטאב "מהשטח" באזור הניהול.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.field_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('signing', 'deal_closed', 'keys', 'happy_clients', 'office', 'other')),
  media_kind text NOT NULL DEFAULT 'video' CHECK (media_kind IN ('video', 'image')),
  media_url text NOT NULL,
  poster_url text,
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'sites')),
  site_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  owner_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  happened_at date,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS field_media_scope_idx ON public.field_media (scope, is_published, sort_order);
CREATE INDEX IF NOT EXISTS field_media_sites_gin ON public.field_media USING gin (site_ids);

GRANT SELECT ON public.field_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.field_media TO authenticated;
GRANT ALL ON public.field_media TO service_role;
ALTER TABLE public.field_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_media_public_select ON public.field_media;
CREATE POLICY field_media_public_select ON public.field_media
  FOR SELECT TO anon, authenticated USING (is_published);
DROP POLICY IF EXISTS field_media_manage_select ON public.field_media;
CREATE POLICY field_media_manage_select ON public.field_media
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
         OR (owner_site_id IS NOT NULL AND public.owns_site(owner_site_id))
         OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = ANY (site_ids) AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS field_media_manage_insert ON public.field_media;
CREATE POLICY field_media_manage_insert ON public.field_media
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin')
              OR (scope = 'sites' AND owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)));
DROP POLICY IF EXISTS field_media_manage_update ON public.field_media;
CREATE POLICY field_media_manage_update ON public.field_media
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)))
  WITH CHECK (public.has_role(auth.uid(), 'admin')
              OR (scope = 'sites' AND owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)));
DROP POLICY IF EXISTS field_media_manage_delete ON public.field_media;
CREATE POLICY field_media_manage_delete ON public.field_media
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (owner_site_id IS NOT NULL AND public.owns_site(owner_site_id)));

CREATE TRIGGER field_media_set_updated_at BEFORE UPDATE ON public.field_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_public_field_media(p_site_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id, 'title', m.title, 'description', m.description, 'category', m.category,
    'mediaKind', m.media_kind, 'mediaUrl', m.media_url, 'posterUrl', m.poster_url,
    'happenedAt', m.happened_at, 'translations', m.translations, 'updatedAt', m.updated_at
  ) ORDER BY m.sort_order, m.happened_at DESC NULLS LAST, m.created_at DESC), '[]'::jsonb)
  FROM public.field_media m
  WHERE m.is_published
    AND (m.scope = 'global' OR (p_site_id IS NOT NULL AND p_site_id = ANY (m.site_ids)))
$$;
GRANT EXECUTE ON FUNCTION public.get_public_field_media(uuid) TO anon, authenticated;
