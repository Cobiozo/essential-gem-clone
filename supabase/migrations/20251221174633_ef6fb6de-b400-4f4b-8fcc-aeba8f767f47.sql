-- Extend team_contacts table with new fields
ALTER TABLE public.team_contacts
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS profession TEXT,
ADD COLUMN IF NOT EXISTS contact_upline_eq_id TEXT,
ADD COLUMN IF NOT EXISTS contact_upline_first_name TEXT,
ADD COLUMN IF NOT EXISTS contact_upline_last_name TEXT,
ADD COLUMN IF NOT EXISTS relationship_status TEXT DEFAULT 'active' CHECK (relationship_status IN ('active', 'suspended', 'closed_success', 'closed_not_now')),
ADD COLUMN IF NOT EXISTS products TEXT,
ADD COLUMN IF NOT EXISTS next_contact_date DATE,
ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_note TEXT,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Create index for reminders
CREATE INDEX IF NOT EXISTS idx_team_contacts_reminder_date ON public.team_contacts(reminder_date) WHERE reminder_date IS NOT NULL AND reminder_sent = false;

-- Create index for next contact date
CREATE INDEX IF NOT EXISTS idx_team_contacts_next_contact_date ON public.team_contacts(next_contact_date) WHERE next_contact_date IS NOT NULL;