-- ============================================================
-- מדידה עצמית (First-party analytics): כניסות לעמודים ואירועי לחיצה,
-- מופרדים לפי site (סוכן) — לדשבורד הסטטיסטיקות באזור הניהול.
--
-- פרטיות: אין מזהה אישי — רק hash של מזהה סשן אקראי (המלחה בצד השרת).
-- כתיבה אך ורק דרך /api/track עם service role — אין מדיניות INSERT ל-anon.
-- קריאה אך ורק דרך פונקציות שרת מסוכמות (assertManager) — אין SELECT ישיר.
-- ============================================================

CREATE TABLE public.page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  path text NOT NULL,
  referrer text,
  utm_source text,
  utm_campaign text,
  session_hash text NOT NULL,
  lang text,
  device text,
  is_new_session boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.track_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN
    ('whatsapp_click','phone_click','property_view','lead_submit','login','search','signup')),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  path text,
  session_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.track_events TO service_role;
-- אין GRANT ל-anon/authenticated: כל הגישה דרך service role בפונקציות שרת

CREATE INDEX page_views_site_time_idx ON public.page_views (site_id, created_at DESC);
CREATE INDEX page_views_time_idx ON public.page_views (created_at DESC);
CREATE INDEX track_events_site_time_idx ON public.track_events (site_id, created_at DESC);
CREATE INDEX track_events_listing_idx ON public.track_events (listing_id) WHERE listing_id IS NOT NULL;

-- ============================================================
-- סיכום אנליטיקס בקריאה אחת (SECURITY DEFINER): אדמין רואה את כל האתרים,
-- סוכן רק את האתרים שבבעלותו. כל האגרגציה בצד המסד — בלי למשוך שורות גולמיות.
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_overview(p_from timestamptz, p_to timestamptz)
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
    SELECT COALESCE(array_agg(id), '{}') INTO v_site_ids
    FROM public.sites WHERE owner_id = auth.uid();
    IF array_length(v_site_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'views', count(*),
        'sessions', count(DISTINCT session_hash),
        'newSessions', count(*) FILTER (WHERE is_new_session)
      )
      FROM public.page_views
      WHERE created_at BETWEEN p_from AND p_to
        AND (v_is_admin OR site_id = ANY (v_site_ids))
    ),
    'perDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'views', views) ORDER BY day), '[]')
      FROM (
        SELECT date_trunc('day', created_at AT TIME ZONE 'Asia/Jerusalem')::date AS day,
               count(*) AS views
        FROM public.page_views
        WHERE created_at BETWEEN p_from AND p_to
          AND (v_is_admin OR site_id = ANY (v_site_ids))
        GROUP BY 1
      ) d
    ),
    'sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'views', views) ORDER BY views DESC), '[]')
      FROM (
        SELECT COALESCE(NULLIF(utm_source, ''),
                 CASE
                   WHEN referrer IS NULL OR referrer = '' THEN 'ישיר'
                   WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%fb.%' THEN 'Facebook'
                   WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
                   WHEN referrer ILIKE '%google%' THEN 'Google'
                   WHEN referrer ILIKE '%whatsapp%' OR referrer ILIKE '%wa.me%' THEN 'WhatsApp'
                   ELSE 'אחר'
                 END) AS source,
               count(*) AS views
        FROM public.page_views
        WHERE created_at BETWEEN p_from AND p_to
          AND (v_is_admin OR site_id = ANY (v_site_ids))
        GROUP BY 1
        ORDER BY views DESC
        LIMIT 12
      ) src
    ),
    'perSite', (
      SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'views')::int DESC), '[]')
      FROM (
        SELECT jsonb_build_object(
          'siteId', s.id,
          'name', s.name,
          'slug', s.slug,
          'views', (SELECT count(*) FROM public.page_views pv
                    WHERE pv.site_id = s.id AND pv.created_at BETWEEN p_from AND p_to),
          'sessions', (SELECT count(DISTINCT pv.session_hash) FROM public.page_views pv
                       WHERE pv.site_id = s.id AND pv.created_at BETWEEN p_from AND p_to),
          'propertyViews', (SELECT count(*) FROM public.track_events te
                            WHERE te.site_id = s.id AND te.type = 'property_view'
                              AND te.created_at BETWEEN p_from AND p_to),
          'whatsappClicks', (SELECT count(*) FROM public.track_events te
                             WHERE te.site_id = s.id AND te.type = 'whatsapp_click'
                               AND te.created_at BETWEEN p_from AND p_to),
          'phoneClicks', (SELECT count(*) FROM public.track_events te
                          WHERE te.site_id = s.id AND te.type = 'phone_click'
                            AND te.created_at BETWEEN p_from AND p_to),
          'leadSubmits', (SELECT count(*) FROM public.track_events te
                          WHERE te.site_id = s.id AND te.type = 'lead_submit'
                            AND te.created_at BETWEEN p_from AND p_to),
          'leads', (SELECT count(*) FROM public.leads ld
                    WHERE ld.site_id = s.id AND ld.created_at BETWEEN p_from AND p_to),
          'signups', (SELECT count(*) FROM public.track_events te
                      WHERE te.site_id = s.id AND te.type = 'signup'
                        AND te.created_at BETWEEN p_from AND p_to)
        ) AS row_data
        FROM public.sites s
        WHERE s.id = ANY (v_site_ids)
      ) sites_data
    ),
    'topListings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'listingId', listing_id, 'title', l.title, 'views', views) ORDER BY views DESC), '[]')
      FROM (
        SELECT te.listing_id, count(*) AS views
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

GRANT EXECUTE ON FUNCTION public.analytics_overview(timestamptz, timestamptz) TO authenticated;
