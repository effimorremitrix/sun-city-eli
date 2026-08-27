-- ============================================================
-- קריטריוני חיפוש מובנים על לידים.
--
-- עד עכשיו "מה הלקוח מחפש" נשמר בליד רק כטקסט חופשי ב-notes (טופס הקונים
-- שיטח תקציב/חדרים/אזור למחרוזת), ולכן אי אפשר היה לסנן, להציג בכרטיס
-- הליד בצורה מסודרת, או להתאים נכסים ללידים אנונימיים. העמודות משקפות את
-- אותם קריטריונים כמו search_profiles (בסגנון הפילטרים של יד2), כך שאותו
-- מנגנון התאמה ישרת גם לקוחות רשומים וגם לידים.
--
-- deal_type כאן הוא *כוונת הלקוח*: 'קנייה' / 'השכרה' / 'מכירה' (מוכר).
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deal_type text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS neighborhoods text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS min_price bigint,
  ADD COLUMN IF NOT EXISTS max_price bigint,
  ADD COLUMN IF NOT EXISTS min_rooms numeric,
  ADD COLUMN IF NOT EXISTS max_rooms numeric,
  ADD COLUMN IF NOT EXISTS min_size integer,
  ADD COLUMN IF NOT EXISTS min_floor integer,
  ADD COLUMN IF NOT EXISTS max_floor integer,
  ADD COLUMN IF NOT EXISTS needs_mamad boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_elevator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_parking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_balcony boolean NOT NULL DEFAULT false,
  -- פרמטרים עתידיים בלי מיגרציה נוספת (למשל מרפסת שמש, כיווני אוויר)
  ADD COLUMN IF NOT EXISTS criteria_extra jsonb;

-- סינון לפי שכונות בהתאמת נכסים ללידים
CREATE INDEX IF NOT EXISTS leads_neighborhoods_gin ON public.leads USING gin (neighborhoods);
