-- Add new columns to events table for enhanced webinar management
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS webinar_type text,
ADD COLUMN IF NOT EXISTS host_name text,
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS sms_reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_reminder_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS guest_link text;

-- Create event reminders log table
CREATE TABLE IF NOT EXISTS public.event_reminders_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('sms', 'email')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on event_reminders_log
ALTER TABLE public.event_reminders_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all reminder logs
CREATE POLICY "Admins can view all reminder logs"
ON public.event_reminders_log
FOR SELECT
USING (public.check_is_admin_for_events());

-- Admin can insert reminder logs
CREATE POLICY "Admins can insert reminder logs"
ON public.event_reminders_log
FOR INSERT
WITH CHECK (public.check_is_admin_for_events());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_reminders_log_event_id ON public.event_reminders_log(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_log_user_id ON public.event_reminders_log(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_log_sent_at ON public.event_reminders_log(sent_at DESC);