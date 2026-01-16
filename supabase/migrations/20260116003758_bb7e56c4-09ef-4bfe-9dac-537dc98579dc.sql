-- Create guest event registrations table
CREATE TABLE guest_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  notes TEXT,
  invited_by_user_id UUID REFERENCES profiles(user_id),
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended')),
  registered_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  source TEXT DEFAULT 'webinar_form',
  team_contact_id UUID REFERENCES team_contacts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_guest_per_event UNIQUE (event_id, email)
);

-- Indexes for performance
CREATE INDEX idx_guest_registrations_event ON guest_event_registrations(event_id);
CREATE INDEX idx_guest_registrations_email ON guest_event_registrations(email);
CREATE INDEX idx_guest_registrations_invited_by ON guest_event_registrations(invited_by_user_id);
CREATE INDEX idx_guest_registrations_reminder ON guest_event_registrations(reminder_sent, status);

-- Enable RLS
ALTER TABLE guest_event_registrations ENABLE ROW LEVEL SECURITY;

-- Public INSERT for anonymous registration
CREATE POLICY "guest_registration_public_insert"
  ON guest_event_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public SELECT for checking if email already registered (validation)
CREATE POLICY "guest_registration_public_select_own"
  ON guest_event_registrations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can do everything
CREATE POLICY "guest_registration_admin_all"
  ON guest_event_registrations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

-- Users can view guests they invited
CREATE POLICY "guest_registration_user_view_invited"
  ON guest_event_registrations FOR SELECT
  TO authenticated
  USING (invited_by_user_id = auth.uid());

-- Users can update their invited guests status
CREATE POLICY "guest_registration_user_update_invited"
  ON guest_event_registrations FOR UPDATE
  TO authenticated
  USING (invited_by_user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_guest_registrations_updated_at
  BEFORE UPDATE ON guest_event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();