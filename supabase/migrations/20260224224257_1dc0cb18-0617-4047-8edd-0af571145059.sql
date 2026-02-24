-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule refresh-google-tokens every 30 minutes
SELECT cron.schedule(
  'refresh-google-tokens',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/refresh-google-tokens',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);