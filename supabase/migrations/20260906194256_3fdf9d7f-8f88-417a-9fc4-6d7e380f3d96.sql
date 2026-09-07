SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'suncity-%';
SELECT cron.schedule('suncity-scout', '0 4 * * *', $c$SELECT public.run_scheduled_job('scout')$c$);
SELECT cron.schedule('suncity-match-profiles', '10 5 * * *', $c$SELECT public.run_scheduled_job('match-profiles')$c$);
SELECT cron.schedule('suncity-backup', '30 23 * * *', $c$SELECT public.run_scheduled_job('backup')$c$);
SELECT cron.schedule('suncity-health-check', '15 * * * *', $c$SELECT public.run_scheduled_job('health-check')$c$);
SELECT cron.schedule('suncity-prune', '45 2 * * 0', $c$SELECT public.prune_activity_log()$c$);