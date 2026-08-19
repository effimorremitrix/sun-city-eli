-- סינון קשיח לסוכן הסריקה: מועמד שסותר את קריטריוני הפרופיל לא נשמר.
--
-- 1. עמודות מתקנים למועמדים — boolean|null: null פירושו שהמודעה לא ציינה
--    (לא ניתן לאשש היעדר), ולכן רק false מפורש נחשב סתירה לקריטריון "חובה".
ALTER TABLE public.scout_candidates
  ADD COLUMN IF NOT EXISTS has_mamad boolean,
  ADD COLUMN IF NOT EXISTS has_elevator boolean,
  ADD COLUMN IF NOT EXISTS has_parking boolean,
  ADD COLUMN IF NOT EXISTS has_balcony boolean;

-- 2. ניקוי חד-פעמי: מועמדים ממתינים מתחת לרף הציון (60) עוברים ל"נדחו".
--    לא נוגעים ב-seen_at, וכל שורה ניתנת להחזרה מטאב "נדחו" בלחיצה.
UPDATE public.scout_candidates
SET status = 'rejected'
WHERE status = 'new' AND match_score < 60;
