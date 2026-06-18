ALTER TABLE public.challenge_settings 
  ADD COLUMN IF NOT EXISTS global_start_date DATE,
  ADD COLUMN IF NOT EXISTS allow_late_join BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.challenge_participants ALTER COLUMN start_date DROP NOT NULL;