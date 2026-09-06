-- ערוצי ההתראות של הסוכן — נפרדים מבעלות הדף (owner_id) ומהפרטים שמוצגים
-- באתר (site_content.business). עד כאן התראות לסוכן הלכו למייל של בעל הדף,
-- שאצל דפים שנזרעו הוא המנהל הראשי ולא הסוכן.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS notify_whatsapp text;

-- Backfill מהפרטים שכבר מוזנים בדף (מייל/טלפון של הסוכן), ואם אין — מייל בעל הדף
UPDATE public.sites s
SET notify_email = COALESCE(NULLIF(c.business->>'email', ''), p.email),
    notify_whatsapp = NULLIF(COALESCE(c.business->>'phoneTel', c.business->>'phone'), '')
FROM public.site_content c, public.profiles p
WHERE c.site_id = s.id AND p.id = s.owner_id
  AND s.notify_email IS NULL AND s.notify_whatsapp IS NULL;
