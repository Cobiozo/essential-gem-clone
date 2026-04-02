ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at timestamptz;