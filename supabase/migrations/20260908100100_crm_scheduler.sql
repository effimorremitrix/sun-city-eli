-- ============================================================
-- תזכורות Follow-up: משימה מתוזמנת נוספת. רצה בשעות העבודה בלבד כדי
-- שתזכורת לא תגיע לסוכן ב-3 לפנות בוקר; המשימה עצמה מסננת לפי חותמות
-- ה-Outbox, ולכן ריצה כפולה לא שולחת פעמיים.
-- ============================================================

DO $$ BEGIN
  PERFORM cron.unschedule('suncity-follow-up-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL; -- המשימה עוד לא קיימת, או ש-pg_cron אינו זמין
END $$;

DO $$ BEGIN
  -- כל 30 דקות בין 06:00 ל-17:59 UTC (בערך 08:00–20:00 בישראל)
  PERFORM cron.schedule(
    'suncity-follow-up-reminders',
    '0,30 6-17 * * *',
    $c$SELECT public.run_scheduled_job('follow-up-reminders')$c$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;
