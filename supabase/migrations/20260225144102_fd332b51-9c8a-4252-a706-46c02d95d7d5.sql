
-- Add prospect_email column to meeting_reminders_sent for tracking prospect reminders
ALTER TABLE public.meeting_reminders_sent 
ADD COLUMN IF NOT EXISTS prospect_email text;

-- Make user_id nullable so we can store prospect reminders without a user
ALTER TABLE public.meeting_reminders_sent 
ALTER COLUMN user_id DROP NOT NULL;
