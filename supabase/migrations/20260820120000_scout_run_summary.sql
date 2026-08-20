-- סיכום הסריקה האחרונה לכל פרופיל של סוכן הסריקה.
--
-- עד היום נשמר רק last_run_at, שמתעדכן גם כשסריקה חזרה ריקה — ולכן פרופיל
-- שלא הביא כלום נראה בלוח הניהול בדיוק כמו פרופיל שעבד. העמודות האלה
-- שומרות את מה שקרה בפועל (כמה נמצאו, כמה נשמרו, כמה נפסלו ולמה), כך
-- שהמידע שורד רענון דף וגם מגיע מסריקות ה-cron הליליות.
ALTER TABLE public.scout_profiles
  ADD COLUMN IF NOT EXISTS last_run_found integer,
  ADD COLUMN IF NOT EXISTS last_run_inserted integer,
  ADD COLUMN IF NOT EXISTS last_run_skipped integer,
  ADD COLUMN IF NOT EXISTS last_run_note text;

-- שליפת מועמדים לפי פרופיל (הסינון החדש בלוח הניהול)
CREATE INDEX IF NOT EXISTS scout_candidates_profile_idx
  ON public.scout_candidates (scout_profile_id, created_at DESC);
