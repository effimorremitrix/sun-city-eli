-- Phase 0: fix stored business overrides for the sun-city site.
-- site_content.business overrides the static defaults in src/lib/site-data.ts
-- (see mergeLive in src/lib/site-live.tsx), so a stale stored email/license
-- would keep showing on the live site even after the code change.
UPDATE public.site_content c
SET business = c.business
  || jsonb_build_object(
       'email', 'kalifeli.suncity@gmail.com',
       'license', '30723354'
     )
FROM public.sites s
WHERE s.id = c.site_id
  AND s.slug = 'sun-city';
