-- Reset cron job state to force immediate run
UPDATE cron_settings 
SET last_run_at = NULL, 
    next_run_at = NOW() 
WHERE job_name = 'process_pending_notifications';