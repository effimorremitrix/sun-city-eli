-- הפיכת /sun-city לדף הראשי: "/" (וגם /en /fr /ru) מפנים בהפניה קבועה (301)
-- אל /sun-city, וה-canonical עובר אל /sun-city. הדגל נשמר
-- ב-site_content.settings.homeRedirect של אתר המשרד וזורם דרך get_public_site.
-- ביטול אפשרי מלוח הניהול בלי דיפלוי: לשונית "סוכנים" → "דפים אישיים" →
-- "/sun-city כדף הראשי".
INSERT INTO public.site_content (site_id, settings)
SELECT s.id, jsonb_build_object('homeRedirect', true)
FROM public.sites s WHERE s.slug = 'sun-city'
ON CONFLICT (site_id) DO UPDATE
SET settings = COALESCE(public.site_content.settings, '{}'::jsonb)
  || jsonb_build_object('homeRedirect', true);
