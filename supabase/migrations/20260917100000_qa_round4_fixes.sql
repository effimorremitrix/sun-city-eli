-- ============================================================
-- סבב תיקונים 4 (QA):
--  1. שחזור ממליצים "שנעלמו": ייבוא חוזר של site_content.testimonials
--     שלא הגיעו לטבלת testimonials, ויצירה מחדש של get_public_testimonials
--     (כדי שדף שלא מצא את ה-RPC לא ייפול חזרה ל-jsonb הישן פר-דף).
--  2. סוג המפרסם במודעות מהשוק: מתווך / פרטי — הסוכן החכם מציג מתיווך בלבד.
--  3. תרגומי הסוכנים ל-get_public_agents (תפקיד ואודות בשפת הדף).
--  4. אוצר רחובות עירוני שאינו תלוי במלאי של SUN CITY.
-- ============================================================

/* ---------------- 1. ממליצים: שחזור והקשחה ---------------- */

-- ייבוא חוזר, אידמפוטנטי: כל ממליץ שנשמר פעם ב-site_content.testimonials
-- ואינו קיים בטבלה חוזר לתצוגה בהיקף הדף שבו הוזן. ריצה חוזרת אינה מכפילה.
INSERT INTO public.testimonials
  (legacy_id, name, type, quote, media_kind, image_url, video_url, poster_url,
   scope, site_ids, owner_site_id, sort_order, translations)
SELECT
  t->>'id',
  COALESCE(NULLIF(t->>'name', ''), 'לקוח/ה'),
  COALESCE(t->>'type', ''),
  t->>'quote',
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
  1000 + (ord - 1),          -- משוחזרים בסוף הרשימה, לא לפני הקיימים
  COALESCE((
    SELECT jsonb_object_agg(lang, COALESCE(c.translations->lang->'testimonials'->(t->>'id'), '{}'::jsonb))
    FROM (VALUES ('en'), ('fr'), ('ru')) AS langs(lang)
    WHERE c.translations->lang->'testimonials' ? (t->>'id')
  ), '{}'::jsonb)
FROM public.site_content c,
     LATERAL jsonb_array_elements(COALESCE(c.testimonials, '[]'::jsonb)) WITH ORDINALITY AS x(t, ord)
WHERE jsonb_typeof(c.testimonials) = 'array'
  AND COALESCE(t->>'quote', '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.testimonials e
    WHERE e.legacy_id = t->>'id' AND e.owner_site_id = c.site_id
  )
  -- גם ממליץ שיובא בעבר בלי legacy_id לא יוכפל: משווים לפי התוכן עצמו
  AND NOT EXISTS (
    SELECT 1 FROM public.testimonials e2
    WHERE e2.owner_site_id = c.site_id
      AND e2.name = COALESCE(NULLIF(t->>'name', ''), 'לקוח/ה')
      AND e2.quote = t->>'quote'
  );

-- יצירה מחדש (ללא שינוי חוזה) — הגנה מפני סביבה שבה המיגרציה המקורית
-- לא הורצה ולכן הקריאה הציבורית נפלה חזרה לתוכן פר-דף
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

-- הקוד אינו כותב יותר ל-site_content.testimonials (ראו saveSiteContent).
-- טריגר הגנה: כתיבה שמקטינה את המערך הישן נחסמת, כדי ששום לקוח ישן שנשאר
-- פתוח בדפדפן לא ידרוס את ההמלצות ההיסטוריות שמשמשות לשחזור.
CREATE OR REPLACE FUNCTION public.guard_legacy_testimonials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- הארכיון הישן נשמר כמות שהוא: עדכון שמנסה לקצר או לרוקן את המערך
  -- מוחזר לערך הקודם. זו רשת הביטחון מול "המלצות שנעלמות".
  IF jsonb_typeof(OLD.testimonials) = 'array'
     AND jsonb_array_length(OLD.testimonials) > 0
     AND (NEW.testimonials IS NULL
          OR jsonb_typeof(NEW.testimonials) <> 'array'
          OR jsonb_array_length(NEW.testimonials) < jsonb_array_length(OLD.testimonials))
  THEN
    NEW.testimonials := OLD.testimonials;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_content_guard_testimonials ON public.site_content;
CREATE TRIGGER site_content_guard_testimonials
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_testimonials();

/* ---------------- 2. סוג המפרסם במודעות מהשוק ---------------- */

ALTER TABLE public.market_listings
  ADD COLUMN IF NOT EXISTS advertiser_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS agency_name text;

DO $$ BEGIN
  ALTER TABLE public.market_listings
    ADD CONSTRAINT market_listings_advertiser_type_check
    CHECK (advertiser_type IN ('agency', 'private', 'unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- מודעות שכבר במאגר: מי שיש לה שם משרד תיווך בתקציר מסומנת כמתיווך,
-- ומי שנכתב עליה במפורש "מודעה פרטית" — פרטית. השאר נשארות unknown
-- ויתמלאו בסריקה הבאה.
UPDATE public.market_listings
   SET advertiser_type = 'agency',
       agency_name = COALESCE(agency_name, NULLIF(substring(description from 'מתיווך ([^·]+)'), ''))
 WHERE advertiser_type = 'unknown'
   AND (description ILIKE '%מתיווך %' OR source = 'komo');

UPDATE public.market_listings
   SET advertiser_type = 'private'
 WHERE advertiser_type = 'unknown'
   AND description ILIKE '%מודעה פרטית%';

CREATE INDEX IF NOT EXISTS market_listings_advertiser_idx
  ON public.market_listings (advertiser_type, is_active) WHERE NOT hidden_by_admin;

-- ההתאמות האוטומטיות (התראות ללקוחות) מתייחסות למודעות מתיווך בלבד
CREATE OR REPLACE FUNCTION public.match_market_listings(p_since timestamptz, p_profile_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_leads integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH ins AS (
    INSERT INTO public.listing_notifications (user_id, contact_id, market_listing_id, search_profile_id, reason)
    SELECT sp.user_id, sp.contact_id, m.id, sp.id, 'התאמה מהשוק לפרופיל: ' || sp.label
    FROM public.search_profiles sp
    JOIN public.market_listings m
      ON m.is_active AND NOT m.hidden_by_admin
     AND m.advertiser_type = 'agency'
     AND m.first_seen_at >= p_since
    WHERE sp.is_active
      AND (p_profile_id IS NULL OR sp.id = p_profile_id)
      AND ((sp.deal_type IN ('קנייה', 'מכירה') AND m.deal_type = 'מכירה')
           OR (sp.deal_type = 'השכרה' AND m.deal_type = 'השכרה'))
      AND (sp.city IS NULL OR sp.city = '' OR sp.city = m.city)
      AND (array_length(sp.neighborhoods, 1) IS NULL OR m.neighborhood = ANY (sp.neighborhoods))
      AND (sp.street IS NULL OR sp.street = '' OR m.address ILIKE '%' || sp.street || '%')
      AND (sp.min_price IS NULL OR m.price IS NULL OR m.price >= sp.min_price)
      AND (sp.max_price IS NULL OR m.price IS NULL OR m.price <= sp.max_price)
      AND (sp.min_rooms IS NULL OR m.rooms IS NULL OR m.rooms >= sp.min_rooms)
      AND (sp.rooms IS NULL OR m.rooms IS NULL OR abs(m.rooms - sp.rooms) <= 0.5)
      AND (sp.max_rooms IS NULL OR m.rooms IS NULL OR m.rooms <= sp.max_rooms)
      AND (sp.min_size IS NULL OR m.size_sqm IS NULL OR m.size_sqm >= sp.min_size)
      AND (NOT sp.needs_mamad OR m.has_mamad IS DISTINCT FROM false)
      AND (NOT sp.needs_elevator OR m.has_elevator IS DISTINCT FROM false)
      AND (NOT sp.needs_parking OR m.has_parking IS DISTINCT FROM false)
      AND (NOT sp.needs_balcony OR m.has_balcony IS DISTINCT FROM false)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  IF p_profile_id IS NULL THEN
    WITH ins AS (
      INSERT INTO public.listing_notifications (lead_id, contact_id, market_listing_id, reason)
      SELECT ld.id, ld.contact_id, m.id, 'התאמה מהשוק לדרישות הליד: ' || ld.full_name
      FROM public.leads ld
      JOIN public.market_listings m
        ON m.is_active AND NOT m.hidden_by_admin
       AND m.advertiser_type = 'agency'
       AND m.first_seen_at >= p_since
      WHERE ld.marketing_consent
        AND ld.status NOT IN ('נסגרה עסקה', 'לא רלוונטי', 'לא בשל כרגע')
        AND ld.search_profile_id IS NULL
        AND (ld.email IS NOT NULL OR ld.phone IS NOT NULL)
        AND ld.deal_type IN ('קנייה', 'השכרה')
        AND ((ld.deal_type = 'קנייה' AND m.deal_type = 'מכירה')
             OR (ld.deal_type = 'השכרה' AND m.deal_type = 'השכרה'))
        AND (ld.city IS NULL OR ld.city = '' OR ld.city = m.city)
        AND (array_length(ld.neighborhoods, 1) IS NULL OR m.neighborhood = ANY (ld.neighborhoods))
        AND (ld.min_price IS NULL OR m.price IS NULL OR m.price >= ld.min_price)
        AND (ld.max_price IS NULL OR m.price IS NULL OR m.price <= ld.max_price)
        AND (ld.min_rooms IS NULL OR m.rooms IS NULL OR m.rooms >= ld.min_rooms)
        AND (ld.max_rooms IS NULL OR m.rooms IS NULL OR m.rooms <= ld.max_rooms)
        AND (ld.min_size IS NULL OR m.size_sqm IS NULL OR m.size_sqm >= ld.min_size)
        AND (NOT ld.needs_mamad OR m.has_mamad IS DISTINCT FROM false)
        AND (NOT ld.needs_elevator OR m.has_elevator IS DISTINCT FROM false)
        AND (NOT ld.needs_parking OR m.has_parking IS DISTINCT FROM false)
        AND (NOT ld.needs_balcony OR m.has_balcony IS DISTINCT FROM false)
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_leads FROM ins;
  END IF;

  RETURN v_inserted + v_leads;
END;
$$;

/* ---------------- 3. תרגומי הסוכנים ---------------- */

-- כרטיסי הצוות הציגו תפקיד בעברית גם בדף אנגלי/צרפתי: התרגומים של כל דף
-- (site_content.translations) חוזרים עכשיו יחד עם הסוכן.
CREATE OR REPLACE FUNCTION public.get_public_agents()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name,
    'agent_name', c.business->>'agentName',
    'role_title', c.business->>'roleTitle',
    'photo_url', c.business->>'photoUrl',
    'phone', c.business->>'phone',
    'phone_tel', c.business->>'phoneTel',
    'translations', COALESCE(c.translations, '{}'::jsonb)
  ) ORDER BY s.sort_order, s.created_at), '[]'::jsonb)
  FROM public.sites s
  LEFT JOIN public.site_content c ON c.site_id = s.id
  WHERE s.is_active
$$;
GRANT EXECUTE ON FUNCTION public.get_public_agents() TO anon, authenticated;

/* ---------------- 4. אוצר רחובות עירוני ---------------- */

-- עד כאן רשימת הרחובות בחיפוש נגזרה מכתובות הנכסים של SUN CITY בלבד, ולכן
-- רחוב שאין בו נכס שלנו לא היה קיים בחיפוש. הפונקציה מחזירה את כל הרחובות
-- הידועים לנו — מנכסי המשרד *ומכל מודעות השוק שנסרקו — בלי מספרי בית.
CREATE OR REPLACE FUNCTION public.get_known_streets(p_city text DEFAULT 'נתניה')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH raw AS (
    SELECT split_part(l.address, ',', 1) AS street
      FROM public.listings l
     WHERE l.address IS NOT NULL AND l.address <> '' AND l.city = p_city
    UNION ALL
    SELECT split_part(m.address, ',', 1)
      FROM public.market_listings m
     WHERE m.address IS NOT NULL AND m.address <> '' AND m.city = p_city
       AND m.is_active AND NOT m.hidden_by_admin
  ), cleaned AS (
    SELECT btrim(regexp_replace(regexp_replace(street, '[0-9]+', '', 'g'), '\s+', ' ', 'g')) AS street
      FROM raw
  )
  SELECT COALESCE(jsonb_agg(DISTINCT street), '[]'::jsonb)
    FROM cleaned
   WHERE char_length(street) >= 2
$$;
GRANT EXECUTE ON FUNCTION public.get_known_streets(text) TO anon, authenticated;
