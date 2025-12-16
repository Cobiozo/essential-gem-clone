-- Create contacts table for contact lifecycle management
CREATE TABLE public.ai_compass_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_type_id UUID REFERENCES ai_compass_contact_types(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES ai_compass_contact_stages(id) ON DELETE SET NULL,
  current_context TEXT,
  last_contact_days INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create contact history table for versioning changes
CREATE TABLE public.ai_compass_contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES ai_compass_contacts(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  ai_session_id UUID REFERENCES ai_compass_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL
);

-- Add contact_id to sessions
ALTER TABLE public.ai_compass_sessions 
ADD COLUMN contact_id UUID REFERENCES ai_compass_contacts(id) ON DELETE SET NULL;

-- Add admin control columns to settings
ALTER TABLE public.ai_compass_settings 
ADD COLUMN allow_delete_contacts BOOLEAN DEFAULT true,
ADD COLUMN allow_delete_history BOOLEAN DEFAULT true,
ADD COLUMN allow_edit_contacts BOOLEAN DEFAULT true,
ADD COLUMN allow_multiple_decisions BOOLEAN DEFAULT true,
ADD COLUMN data_retention_days INTEGER DEFAULT NULL;

-- Enable RLS on new tables
ALTER TABLE public.ai_compass_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_compass_contact_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users manage own contacts" ON public.ai_compass_contacts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all contacts" ON public.ai_compass_contacts
  FOR SELECT USING (is_admin());

-- RLS Policies for contact history
CREATE POLICY "Users view own contact history" ON public.ai_compass_contact_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_compass_contacts 
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own contact history" ON public.ai_compass_contact_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_compass_contacts 
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own contact history" ON public.ai_compass_contact_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ai_compass_contacts 
      WHERE id = contact_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all contact history" ON public.ai_compass_contact_history
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Create updated_at trigger for contacts
CREATE TRIGGER update_ai_compass_contacts_updated_at
  BEFORE UPDATE ON public.ai_compass_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_ai_compass_contacts_user_id ON public.ai_compass_contacts(user_id);
CREATE INDEX idx_ai_compass_contacts_is_active ON public.ai_compass_contacts(is_active);
CREATE INDEX idx_ai_compass_contact_history_contact_id ON public.ai_compass_contact_history(contact_id);
CREATE INDEX idx_ai_compass_sessions_contact_id ON public.ai_compass_sessions(contact_id);