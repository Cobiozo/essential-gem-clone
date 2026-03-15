
-- Add attempts column to mfa_email_codes for brute-force protection
ALTER TABLE public.mfa_email_codes ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- Create rate-limiting table for MFA verification attempts
CREATE TABLE IF NOT EXISTS public.mfa_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'send_code', 'verify_code', 'self_reset'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mfa_rate_limits_user_action ON public.mfa_rate_limits (user_id, action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_mfa_email_codes_attempts ON public.mfa_email_codes (user_id, used, expires_at);

-- RLS on rate_limits (service role only)
ALTER TABLE public.mfa_rate_limits ENABLE ROW LEVEL SECURITY;
