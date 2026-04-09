
ALTER TABLE public.hk_otp_sessions
  ADD COLUMN guest_first_name text,
  ADD COLUMN guest_last_name text,
  ADD COLUMN guest_email text,
  ADD COLUMN guest_phone text,
  ADD COLUMN email_consent boolean NOT NULL DEFAULT false;
