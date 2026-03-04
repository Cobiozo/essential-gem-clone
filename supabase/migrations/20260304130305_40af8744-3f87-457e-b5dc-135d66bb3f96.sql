
-- Reschedule the pg_cron job to run every 30 minutes
SELECT cron.unschedule('process-pending-notifications');

SELECT cron.schedule(
  'process-pending-notifications',
  '0,30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/process-pending-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);
