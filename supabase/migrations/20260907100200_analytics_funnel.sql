-- ============================================================
-- סטטיסטיקות v2: משפך המרות ומקורות לידים.
-- כניסות → צפייה בנכס → פנייה (וואטסאפ/טלפון/טופס) → הרשמה → ליד →
-- התעניינות → עסקה, לכלל האתר ולכל סוכן; מקורות לידים (utm/referrer/
-- דף סוכן/קמפיין) ומה כל מקור מייצר בפועל (לידים, התעניינויות, עסקאות).
-- ============================================================

-- סוגי אירועים נוספים במדידה
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
    -- המשפך הכללי (סשנים ייחודיים לכל שלב; לידים/עסקאות לפי רשומות)
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
    -- המשפך לכל סוכן
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
    -- מקורות לידים: מאיפה כל ליד הגיע ומה הוא הניב
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
    -- לפי סוג הטופס/הערוץ שבו הליד נכנס
    'leadChannels', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'leads', leads) ORDER BY leads DESC), '[]')
      FROM (
        SELECT ld.source, count(*) AS leads
        FROM public.leads ld
        WHERE ld.created_at BETWEEN p_from AND p_to AND (v_is_admin OR ld.site_id = ANY (v_site_ids))
        GROUP BY 1
      ) ch
    ),
    -- קמפיינים (utm_campaign / קמפיין Meta)
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
    -- דף הסוכן שדרכו הלקוח הגיע לראשונה (מגע ראשון)
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
    -- הנכסים הנצפים — בהיקף הסוכן (התיקון לדוח הקודם שהראה את כל המשרד)
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
