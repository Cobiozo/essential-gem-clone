SELECT cron.unschedule('send-meeting-reminders-every-15min');

SELECT cron.schedule(
  'send-meeting-reminders-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/send-meeting-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);