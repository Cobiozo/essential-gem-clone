ALTER TABLE public.user_google_tokens 
  ADD COLUMN IF NOT EXISTS refresh_fail_count integer DEFAULT 0;