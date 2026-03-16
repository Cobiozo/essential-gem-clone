-- Add thank_you_sent columns to event_registrations
ALTER TABLE public.event_registrations 
  ADD COLUMN IF NOT EXISTS thank_you_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS thank_you_sent_at timestamptz;

-- Add thank_you_sent columns to guest_event_registrations
ALTER TABLE public.guest_event_registrations 
  ADD COLUMN IF NOT EXISTS thank_you_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS thank_you_sent_at timestamptz;