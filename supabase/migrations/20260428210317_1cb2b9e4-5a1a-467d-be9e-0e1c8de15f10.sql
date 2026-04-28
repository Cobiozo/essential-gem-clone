ALTER TABLE public.omega_test_clients
  ADD COLUMN IF NOT EXISTS test_number text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS carrier text;