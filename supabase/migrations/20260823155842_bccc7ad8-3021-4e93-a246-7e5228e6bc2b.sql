UPDATE public.sites
SET slug = 'eli-kalif'
WHERE slug = 'sun-city'
  AND NOT EXISTS (SELECT 1 FROM public.sites s2 WHERE s2.slug = 'eli-kalif');