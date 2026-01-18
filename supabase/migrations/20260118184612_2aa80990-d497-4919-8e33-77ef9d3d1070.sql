-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to send meeting reminders every 15 minutes
SELECT cron.schedule(
  'send-meeting-reminders-every-15min',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/send-meeting-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNDA3NzAsImV4cCI6MjA1MTkxNjc3MH0.P8ZuOUk84Cf28dPqLHiQSMGhB2m4fZAKMNKNfjBp-Ts"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);