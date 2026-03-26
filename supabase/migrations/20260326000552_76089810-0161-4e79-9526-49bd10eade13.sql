ALTER TABLE public.auto_webinar_views 
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_registration_id UUID REFERENCES public.guest_event_registrations(id);