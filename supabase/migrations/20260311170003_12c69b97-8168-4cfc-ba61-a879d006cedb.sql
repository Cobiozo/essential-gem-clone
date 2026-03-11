-- Insert cron_settings record for scheduled-translate-sync
INSERT INTO public.cron_settings (job_name, interval_minutes, is_enabled)
VALUES ('scheduled-translate-sync', 1440, true)
ON CONFLICT (job_name) DO NOTHING;

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Create the cron job to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'scheduled-translate-sync-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/scheduled-translate-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);