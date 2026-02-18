
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup stale meeting participants every hour
SELECT cron.schedule(
  'cleanup-stale-meeting-participants',
  '0 * * * *',
  $$SELECT public.cleanup_stale_meeting_participants()$$
);

-- Cleanup old meeting chat messages daily at 3 AM
SELECT cron.schedule(
  'cleanup-old-meeting-chat',
  '0 3 * * *',
  $$SELECT public.cleanup_old_meeting_chat()$$
);
