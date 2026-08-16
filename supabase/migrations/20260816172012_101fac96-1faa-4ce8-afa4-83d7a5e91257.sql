INSERT INTO public.sites (slug, name, owner_id)
SELECT 'sun-city', 'סאן סיטי נדל"ן', ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.sites s WHERE s.slug = 'sun-city')
ORDER BY ur.created_at
LIMIT 1;

UPDATE public.listings l
SET site_id = s.id
FROM public.sites s
WHERE s.slug = 'sun-city' AND l.site_id IS NULL;

INSERT INTO public.site_content (site_id, business)
SELECT s.id, jsonb_build_object('email', 'kalifeli.suncity@gmail.com', 'license', '30723354')
FROM public.sites s
WHERE s.slug = 'sun-city'
ON CONFLICT (site_id) DO UPDATE
SET business = public.site_content.business
  || jsonb_build_object('email', 'kalifeli.suncity@gmail.com', 'license', '30723354');

INSERT INTO public.sold_properties (site_id, address, neighborhood, sort_order, is_published)
SELECT s.id, v.address, v.neighborhood, v.sort_order, true
FROM public.sites s
CROSS JOIN (
  VALUES
    ('יוספטל 7 נתניה', 'נאות הרצל', 0),
    ('איכילוב 4 נתניה', NULL, 1)
) AS v(address, neighborhood, sort_order)
WHERE s.slug = 'sun-city'
  AND NOT EXISTS (
    SELECT 1 FROM public.sold_properties sp
    WHERE sp.site_id = s.id AND sp.address = v.address
  );