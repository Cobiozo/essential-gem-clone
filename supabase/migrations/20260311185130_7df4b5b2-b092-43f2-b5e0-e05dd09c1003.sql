
-- Update pg_cron schedule for process-pending-notifications to */5
-- Using ALTER to change the schedule directly
SELECT cron.alter_job(
  job_id := 7,
  schedule := '*/5 * * * *'
);
