ALTER TABLE public.omega_test_reminder_log
  DROP CONSTRAINT IF EXISTS omega_test_reminder_log_status_check;

ALTER TABLE public.omega_test_reminder_log
  ADD CONSTRAINT omega_test_reminder_log_status_check
  CHECK (status IN ('sent','delivered','failed','bounced','skipped'));
