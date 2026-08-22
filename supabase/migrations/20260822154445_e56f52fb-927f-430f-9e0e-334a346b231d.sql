INSERT INTO public.site_content (site_id, settings)
SELECT s.id, jsonb_build_object('homeRedirect', true)
FROM public.sites s WHERE s.slug = 'sun-city'
ON CONFLICT (site_id) DO UPDATE
SET settings = COALESCE(public.site_content.settings, '{}'::jsonb)
  || jsonb_build_object('homeRedirect', true);