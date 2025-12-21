-- ============================================
-- MODUŁ: Baza kontaktów zespołu
-- ============================================

-- 1. Rozszerzenie tabeli profiles o UpLine
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS upline_eq_id TEXT,
ADD COLUMN IF NOT EXISTS upline_first_name TEXT,
ADD COLUMN IF NOT EXISTS upline_last_name TEXT;

-- 2. Główna tabela kontaktów zespołu
CREATE TABLE IF NOT EXISTS public.team_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Dane podstawowe
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  eq_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('client', 'partner', 'specjalista')),
  
  -- Daty
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  added_at DATE DEFAULT CURRENT_DATE,
  
  -- Notatki użytkownika
  notes TEXT,
  
  -- POLA WARUNKOWE (dla klienta)
  purchased_product TEXT,
  purchase_date DATE,
  client_status TEXT CHECK (client_status IS NULL OR client_status IN ('active', 'inactive')),
  
  -- POLA WARUNKOWE (dla partnera/specjalisty)
  collaboration_level TEXT,
  start_date DATE,
  partner_status TEXT CHECK (partner_status IS NULL OR partner_status IN ('active', 'suspended')),
  
  is_active BOOLEAN DEFAULT true
);

-- 3. Historia zmian kontaktów (audit log)
CREATE TABLE IF NOT EXISTS public.team_contacts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.team_contacts(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Centralny system powiadomień
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Typ i źródło
  notification_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  
  -- Treść
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  
  -- Metadata (dodatkowe dane JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Powiązanie z kontaktem (opcjonalne)
  related_contact_id UUID REFERENCES public.team_contacts(id) ON DELETE SET NULL,
  
  -- Nadawca (kto wywołał powiadomienie)
  sender_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Ustawienia eksportu dla bazy kontaktów (rozszerzenie ai_compass_settings)
ALTER TABLE public.ai_compass_settings 
ADD COLUMN IF NOT EXISTS allow_team_contacts_export BOOLEAN DEFAULT false;

-- ============================================
-- INDEKSY
-- ============================================
CREATE INDEX IF NOT EXISTS idx_team_contacts_user_id ON public.team_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_team_contacts_role ON public.team_contacts(role);
CREATE INDEX IF NOT EXISTS idx_team_contacts_is_active ON public.team_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_team_contacts_history_contact_id ON public.team_contacts_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- team_contacts
ALTER TABLE public.team_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own team contacts"
ON public.team_contacts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all team contacts"
ON public.team_contacts FOR SELECT
USING (public.is_admin());

CREATE POLICY "Users can insert their own team contacts"
ON public.team_contacts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team contacts"
ON public.team_contacts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own team contacts"
ON public.team_contacts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all team contacts"
ON public.team_contacts FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- team_contacts_history
ALTER TABLE public.team_contacts_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their own contacts"
ON public.team_contacts_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_contacts
    WHERE team_contacts.id = team_contacts_history.contact_id
    AND team_contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all contact history"
ON public.team_contacts_history FOR SELECT
USING (public.is_admin());

CREATE POLICY "Users can insert history for their own contacts"
ON public.team_contacts_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_contacts
    WHERE team_contacts.id = team_contacts_history.contact_id
    AND team_contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all contact history"
ON public.team_contacts_history FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
ON public.user_notifications FOR SELECT
USING (public.is_admin());

CREATE POLICY "Authenticated users can insert notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.user_notifications FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================
-- TRIGGER dla aktualizacji updated_at
-- ============================================
CREATE OR REPLACE TRIGGER update_team_contacts_updated_at
  BEFORE UPDATE ON public.team_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();