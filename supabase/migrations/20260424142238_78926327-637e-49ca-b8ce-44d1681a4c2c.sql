-- Repoint event_id FKs from public.events to public.paid_events
ALTER TABLE public.event_registration_forms 
  DROP CONSTRAINT IF EXISTS event_registration_forms_event_id_fkey;
ALTER TABLE public.event_registration_forms 
  ADD CONSTRAINT event_registration_forms_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public.paid_events(id) ON DELETE CASCADE;

ALTER TABLE public.event_form_submissions 
  DROP CONSTRAINT IF EXISTS event_form_submissions_event_id_fkey;
ALTER TABLE public.event_form_submissions 
  ADD CONSTRAINT event_form_submissions_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public.paid_events(id) ON DELETE CASCADE;

ALTER TABLE public.paid_event_partner_links 
  DROP CONSTRAINT IF EXISTS paid_event_partner_links_event_id_fkey;
ALTER TABLE public.paid_event_partner_links 
  ADD CONSTRAINT paid_event_partner_links_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public.paid_events(id) ON DELETE CASCADE;