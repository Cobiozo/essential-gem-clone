-- Add final_status column to ai_compass_contacts for closed contacts
ALTER TABLE public.ai_compass_contacts
ADD COLUMN final_status TEXT DEFAULT NULL,
ADD COLUMN final_status_set_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN suggested_next_contact TIMESTAMPTZ DEFAULT NULL;

-- final_status can be: NULL (active), 'success' (closed-success), 'not_now' (closed - can reactivate)

-- Add index for filtering active vs closed contacts
CREATE INDEX idx_ai_compass_contacts_final_status ON public.ai_compass_contacts(final_status);
CREATE INDEX idx_ai_compass_contacts_suggested_next ON public.ai_compass_contacts(suggested_next_contact);

-- Add comment explaining the statuses
COMMENT ON COLUMN public.ai_compass_contacts.final_status IS 'NULL = active, success = closed with success, not_now = closed but can reactivate';

-- Add admin settings for new features
ALTER TABLE public.ai_compass_settings
ADD COLUMN IF NOT EXISTS show_today_dashboard BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_contact_timeline BOOLEAN DEFAULT true;