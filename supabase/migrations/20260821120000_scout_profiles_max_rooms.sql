-- מקסימום חדרים לפרופיל סריקה.
--
-- עד היום היה רק min_rooms, ולכן אי אפשר היה להגדיר חיפוש של "בדיוק 4
-- חדרים" — בדיוק החיפוש הנפוץ ביותר בלוחות. הלוחות עצמם (יד2, קומו)
-- מקבלים maxRooms כפרמטר חיפוש, כך שהסינון קורה כבר בצד שלהם.
ALTER TABLE public.scout_profiles
  ADD COLUMN IF NOT EXISTS max_rooms numeric;
