-- שחזור רשימת הסוכנים + דף אישי לכל סוכן (אידמפוטנטי).
INSERT INTO public.sites (slug, name, owner_id, sort_order)
SELECT v.slug, v.name, owner.owner_id, v.sort_order
FROM (SELECT owner_id FROM public.sites WHERE slug = 'sun-city' LIMIT 1) AS owner
CROSS JOIN (
  VALUES
    ('inbal',  'עינבל קובל בוזגלו', 2),
    ('kobi',   'קובי בוזגלו',       3),
    ('elad',   'אלעד אבוטבול',      5),
    ('koral',  'קוראל בוחבוט',      6),
    ('daniel', 'דניאל מוצא',        7)
) AS v(slug, name, sort_order)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.sites SET sort_order = 1 WHERE slug = 'sun-city';
UPDATE public.sites SET sort_order = 4 WHERE slug = 'yelena';

INSERT INTO public.site_content (site_id, business, texts)
SELECT
  s.id,
  jsonb_build_object(
    'agentName', v.agent_name,
    'roleTitle', v.role_title,
    'photoUrl',  v.photo_url,
    'bio',       '',
    'social',    jsonb_build_object('facebook', '', 'instagram', '', 'tiktok', '')
  ),
  jsonb_build_object('heroTitle', v.agent_name || ' — נדל"ן בנתניה')
FROM public.sites s
JOIN (
  VALUES
    ('inbal',  'עינבל קובל בוזגלו', 'מנהלת הצוות ושותפה, מומחית לדירות יד שנייה',
     '/__l5e/assets-v1/47682b76-ba79-4b35-87bf-83c8c310c7f4/agent-inbal.jpg'),
    ('kobi',   'קובי בוזגלו',       'יועץ נדל"ן ומשכנתאות, מרכז וצפון נתניה ותושבי חוץ',
     '/__l5e/assets-v1/c6f71e06-fcd5-4bf2-a020-b770a4696fe4/agent-kobi.jpg'),
    ('elad',   'אלעד אבוטבול',      'מומחה לדירות יד שנייה, מרכז ודרום נתניה',
     '/__l5e/assets-v1/2e278c4d-c225-4997-ab53-951d91cca8f3/agent-elad.jpg'),
    ('koral',  'קוראל בוחבוט',      'יועצת נדל"ן, הערכות שווי וליווי תושבי חוץ',
     '/__l5e/assets-v1/340c1a9d-e26c-4b87-82a6-d5951565ac1f/agent-koral.jpg'),
    ('daniel', 'דניאל מוצא',        'מומחה נדל"ן, דרום נתניה',
     '/__l5e/assets-v1/b46e4f6c-b954-46e2-890c-1d9d73e44b55/agent-daniel.jpg')
) AS v(slug, agent_name, role_title, photo_url) ON v.slug = s.slug
ON CONFLICT (site_id) DO NOTHING;

UPDATE public.sites SET name = 'ילנה גנדלין' WHERE slug = 'yelena';

UPDATE public.site_content c
SET business = COALESCE(c.business, '{}'::jsonb) || jsonb_build_object(
  'agentName', 'ילנה גנדלין',
  'photoUrl',  '/__l5e/assets-v1/f11dc67e-a6c3-4874-9bf0-35b39c49ed03/agent-yelena.jpg'
)
FROM public.sites s
WHERE s.id = c.site_id AND s.slug = 'yelena';

-- העברת בעלות על דף סוכן מתוך קוד שרת מהימן (auth.uid() IS NULL) לא נחסמת
CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

-- הרשאות ל-bucket נכסי המותג site-media: קריאה לכל אחד, כתיבה למנהלי אתר בלבד
DROP POLICY IF EXISTS site_media_public_select ON storage.objects;
DROP POLICY IF EXISTS site_media_manager_insert ON storage.objects;
DROP POLICY IF EXISTS site_media_manager_update ON storage.objects;
DROP POLICY IF EXISTS site_media_manager_delete ON storage.objects;

CREATE POLICY site_media_public_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-media');

CREATE POLICY site_media_manager_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.is_site_manager());

CREATE POLICY site_media_manager_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND public.is_site_manager())
  WITH CHECK (bucket_id = 'site-media' AND public.is_site_manager());

CREATE POLICY site_media_manager_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND public.is_site_manager());

-- קואורדינטות לנכסים להצגה על מפה
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS listings_coords_idx ON public.listings (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;