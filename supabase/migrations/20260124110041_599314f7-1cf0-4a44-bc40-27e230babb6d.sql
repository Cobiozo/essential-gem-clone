-- Add first_used_at column to track when OTP code was first used
-- Timer will start from first use, not from generation

ALTER TABLE public.hk_otp_codes 
ADD COLUMN IF NOT EXISTS first_used_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.hk_otp_codes.first_used_at IS 'Timestamp when the code was first used. Access timer starts from this moment.';