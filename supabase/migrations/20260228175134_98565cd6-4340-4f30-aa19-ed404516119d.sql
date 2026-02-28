
SELECT cron.schedule(
  'cleanup-expired-guest-tokens',
  '0 */6 * * *',
  $$SELECT public.cleanup_expired_guest_tokens()$$
);
