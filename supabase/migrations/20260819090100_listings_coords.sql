-- קואורדינטות לנכסים — כדי להציג את כל הנכסים כנעצים על מפה.
-- הערכים מתמלאים בגיאוקוד אוטומטי מהכתובת בשמירת הנכס, וניתנים לעריכה ידנית
-- באזור הניהול. NULL = אין מיקום מדויק; הנכס פשוט לא מוצג על המפה (בלי ניחושים).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS listings_coords_idx ON public.listings (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
