CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text,
  name text NOT NULL,
  type text NOT NULL DEFAULT '',
  quote text NOT NULL,
  media_kind text NOT NULL DEFAULT 'text' CHECK (media_kind IN ('text', 'image', 'video')),
  image_url text,
  video_url text,
  poster_url text,
  scope text NOT NULL DEFAULT 'sites' CHECK (scope IN ('global', 'sites')),
  site_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  owner_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
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

DROP TRIGGER IF EXISTS testimonials_set_updated_at ON public.testimonials;
CREATE TRIGGER testimonials_set_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

DROP TRIGGER IF EXISTS field_media_set_updated_at ON public.field_media;
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

ALTER TABLE public.track_events DROP CONSTRAINT IF EXISTS track_events_type_check;
ALTER TABLE public.track_events ADD CONSTRAINT track_events_type_check
  CHECK (type IN ('whatsapp_click', 'phone_click', 'property_view', 'market_view', 'lead_submit',
                  'login', 'search', 'ai_search', 'signup', 'interest', 'callback', 'agent_cta'));

CREATE OR REPLACE FUNCTION public.analytics_funnel(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_site_ids uuid[];
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
    'funnel', (
      SELECT jsonb_build_object(
        'visits', (SELECT count(DISTINCT session_hash) FROM public.page_views
                   WHERE created_at BETWEEN p_from AND p_to AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'propertyViews', (SELECT count(DISTINCT session_hash) FROM public.track_events
                          WHERE type IN ('property_view', 'market_view') AND created_at BETWEEN p_from AND p_to
                            AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'contacts', (SELECT count(DISTINCT session_hash) FROM public.track_events
                     WHERE type IN ('whatsapp_click', 'phone_click', 'lead_submit') AND created_at BETWEEN p_from AND p_to
                       AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'signups', (SELECT count(*) FROM public.track_events
                    WHERE type = 'signup' AND created_at BETWEEN p_from AND p_to
                      AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'leads', (SELECT count(*) FROM public.leads
                  WHERE created_at BETWEEN p_from AND p_to AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'interests', (SELECT count(DISTINCT lead_id) FROM public.lead_events
                      WHERE event_type = 'client_response' AND created_at BETWEEN p_from AND p_to
                        AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'callbacks', (SELECT count(*) FROM public.activity_log
                      WHERE event = 'callback_requested' AND created_at BETWEEN p_from AND p_to
                        AND (v_is_admin OR site_id = ANY (v_site_ids))),
        'deals', (SELECT count(*) FROM public.lead_events
                  WHERE event_type = 'status_change' AND metadata->>'to_status' = 'נסגרה עסקה'
                    AND created_at BETWEEN p_from AND p_to AND (v_is_admin OR site_id = ANY (v_site_ids)))
      )
    ),
    'perSite', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'visits')::int DESC), '[]')
      FROM (
        SELECT jsonb_build_object(
          'siteId', s.id, 'name', s.name, 'slug', s.slug,
          'visits', (SELECT count(DISTINCT pv.session_hash) FROM public.page_views pv
                     WHERE pv.site_id = s.id AND pv.created_at BETWEEN p_from AND p_to),
          'propertyViews', (SELECT count(*) FROM public.track_events te
                            WHERE te.site_id = s.id AND te.type IN ('property_view', 'market_view') AND te.created_at BETWEEN p_from AND p_to),
          'whatsappClicks', (SELECT count(*) FROM public.track_events te
                             WHERE te.site_id = s.id AND te.type = 'whatsapp_click' AND te.created_at BETWEEN p_from AND p_to),
          'phoneClicks', (SELECT count(*) FROM public.track_events te
                          WHERE te.site_id = s.id AND te.type = 'phone_click' AND te.created_at BETWEEN p_from AND p_to),
          'aiSearches', (SELECT count(*) FROM public.track_events te
                         WHERE te.site_id = s.id AND te.type IN ('search', 'ai_search') AND te.created_at BETWEEN p_from AND p_to),
          'signups', (SELECT count(*) FROM public.track_events te
                      WHERE te.site_id = s.id AND te.type = 'signup' AND te.created_at BETWEEN p_from AND p_to),
          'leads', (SELECT count(*) FROM public.leads ld
                    WHERE ld.site_id = s.id AND ld.created_at BETWEEN p_from AND p_to),
          'interests', (SELECT count(DISTINCT le.lead_id) FROM public.lead_events le
                        WHERE le.site_id = s.id AND le.event_type = 'client_response' AND le.created_at BETWEEN p_from AND p_to),
          'callbacks', (SELECT count(*) FROM public.activity_log al
                        WHERE al.site_id = s.id AND al.event = 'callback_requested' AND al.created_at BETWEEN p_from AND p_to),
          'deals', (SELECT count(*) FROM public.lead_events le
                    WHERE le.site_id = s.id AND le.event_type = 'status_change'
                      AND le.metadata->>'to_status' = 'נסגרה עסקה' AND le.created_at BETWEEN p_from AND p_to),
          'openLeads', (SELECT count(*) FROM public.leads ld
                        WHERE ld.site_id = s.id AND ld.status NOT IN ('נסגרה עסקה', 'לא רלוונטי'))
        ) AS row_data
        FROM public.sites s
        WHERE s.id = ANY (v_site_ids)
      ) x
    ),
    'leadSources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'source', source, 'leads', leads, 'interests', interests, 'deals', deals
      ) ORDER BY leads DESC), '[]')
      FROM (
        SELECT
          COALESCE(NULLIF(ld.utm_source, ''),
            CASE
              WHEN ld.referrer IS NULL OR ld.referrer = '' THEN
                CASE WHEN ld.source = 'קמפיין' THEN 'קמפיין'
                     WHEN ld.source IN ('Facebook', 'Instagram', 'WhatsApp') THEN ld.source
                     ELSE 'ישיר' END
              WHEN ld.referrer ILIKE '%facebook%' OR ld.referrer ILIKE '%fb.%' THEN 'Facebook'
              WHEN ld.referrer ILIKE '%instagram%' THEN 'Instagram'
              WHEN ld.referrer ILIKE '%google%' THEN 'Google'
              WHEN ld.referrer ILIKE '%whatsapp%' OR ld.referrer ILIKE '%wa.me%' THEN 'WhatsApp'
              WHEN ld.referrer ILIKE '%tiktok%' THEN 'TikTok'
              ELSE 'אחר'
            END) AS source,
          count(*) AS leads,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.lead_events le WHERE le.lead_id = ld.id AND le.event_type = 'client_response')) AS interests,
          count(*) FILTER (WHERE ld.status = 'נסגרה עסקה') AS deals
        FROM public.leads ld
        WHERE ld.created_at BETWEEN p_from AND p_to AND (v_is_admin OR ld.site_id = ANY (v_site_ids))
        GROUP BY 1
      ) src
    ),
    'leadChannels', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'leads', leads) ORDER BY leads DESC), '[]')
      FROM (
        SELECT ld.source, count(*) AS leads
        FROM public.leads ld
        WHERE ld.created_at BETWEEN p_from AND p_to AND (v_is_admin OR ld.site_id = ANY (v_site_ids))
        GROUP BY 1
      ) ch
    ),
    'campaigns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'campaign', campaign, 'leads', leads, 'deals', deals
      ) ORDER BY leads DESC), '[]')
      FROM (
        SELECT COALESCE(NULLIF(ld.utm_campaign, ''), ld.criteria_extra->>'campaign_name') AS campaign,
               count(*) AS leads,
               count(*) FILTER (WHERE ld.status = 'נסגרה עסקה') AS deals
        FROM public.leads ld
        WHERE ld.created_at BETWEEN p_from AND p_to AND (v_is_admin OR ld.site_id = ANY (v_site_ids))
          AND (NULLIF(ld.utm_campaign, '') IS NOT NULL OR ld.criteria_extra->>'campaign_name' IS NOT NULL)
        GROUP BY 1
        LIMIT 30
      ) c
    ),
    'firstTouchSites', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('siteId', s.id, 'name', s.name, 'contacts', cnt) ORDER BY cnt DESC), '[]')
      FROM (
        SELECT c.first_site_id, count(*) AS cnt
        FROM public.contacts c
        WHERE c.created_at BETWEEN p_from AND p_to AND c.first_site_id IS NOT NULL
          AND (v_is_admin OR c.first_site_id = ANY (v_site_ids))
        GROUP BY 1
      ) f
      JOIN public.sites s ON s.id = f.first_site_id
    ),
    'topListings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'listingId', listing_id, 'title', l.title, 'views', views, 'leads', leads) ORDER BY views DESC), '[]')
      FROM (
        SELECT te.listing_id, count(*) AS views,
               (SELECT count(*) FROM public.leads ld WHERE ld.listing_id = te.listing_id AND ld.created_at BETWEEN p_from AND p_to) AS leads
        FROM public.track_events te
        WHERE te.type = 'property_view' AND te.listing_id IS NOT NULL
          AND te.created_at BETWEEN p_from AND p_to
          AND (v_is_admin OR te.site_id = ANY (v_site_ids))
        GROUP BY te.listing_id
        ORDER BY views DESC
        LIMIT 10
      ) top
      JOIN public.listings l ON l.id = top.listing_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.analytics_funnel(timestamptz, timestamptz) TO authenticated;