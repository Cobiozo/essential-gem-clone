-- AI Compass settings table (admin control)
CREATE TABLE public.ai_compass_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_for_partners boolean NOT NULL DEFAULT true,
  enabled_for_specjalista boolean NOT NULL DEFAULT true,
  enabled_for_clients boolean NOT NULL DEFAULT false,
  allow_export boolean NOT NULL DEFAULT false,
  ai_learning_enabled boolean NOT NULL DEFAULT true,
  ai_system_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contact types (predefined + admin-defined)
CREATE TABLE public.ai_compass_contact_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_name text DEFAULT 'User',
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contact stages per type
CREATE TABLE public.ai_compass_contact_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type_id uuid REFERENCES public.ai_compass_contact_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partner decision sessions (full history)
CREATE TABLE public.ai_compass_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_type_id uuid REFERENCES public.ai_compass_contact_types(id),
  stage_id uuid REFERENCES public.ai_compass_contact_stages(id),
  context_description text NOT NULL,
  last_contact_days integer,
  ai_decision text NOT NULL CHECK (ai_decision IN ('ACT', 'WAIT')),
  ai_reasoning text,
  generated_message text,
  recommended_resource_id uuid REFERENCES public.knowledge_resources(id),
  generated_reflink text,
  user_feedback text CHECK (user_feedback IN ('positive', 'negative', 'neutral', NULL)),
  notes text,
  tags text[] DEFAULT '{}',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Anonymous learning data (aggregated patterns)
CREATE TABLE public.ai_compass_learning_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type_id uuid REFERENCES public.ai_compass_contact_types(id),
  stage_id uuid REFERENCES public.ai_compass_contact_stages(id),
  pattern_type text NOT NULL CHECK (pattern_type IN ('success', 'failure', 'neutral')),
  context_keywords text[],
  optimal_timing_days integer,
  success_rate numeric(5,2),
  sample_count integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_compass_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_compass_contact_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_compass_contact_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_compass_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_compass_learning_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: ai_compass_settings
CREATE POLICY "Admins can manage ai_compass_settings" ON public.ai_compass_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Everyone can view ai_compass_settings" ON public.ai_compass_settings FOR SELECT USING (true);

-- RLS Policies: ai_compass_contact_types
CREATE POLICY "Admins can manage contact types" ON public.ai_compass_contact_types FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Everyone can view active contact types" ON public.ai_compass_contact_types FOR SELECT USING (is_active = true);

-- RLS Policies: ai_compass_contact_stages
CREATE POLICY "Admins can manage stages" ON public.ai_compass_contact_stages FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Everyone can view active stages" ON public.ai_compass_contact_stages FOR SELECT USING (is_active = true);

-- RLS Policies: ai_compass_sessions
CREATE POLICY "Users can manage own sessions" ON public.ai_compass_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all sessions" ON public.ai_compass_sessions FOR SELECT USING (is_admin());

-- RLS Policies: ai_compass_learning_patterns
CREATE POLICY "Admins can manage learning patterns" ON public.ai_compass_learning_patterns FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Everyone can view learning patterns" ON public.ai_compass_learning_patterns FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.ai_compass_settings (is_enabled, enabled_for_partners, enabled_for_specjalista, ai_system_prompt)
VALUES (true, true, true, 'Jesteś asystentem wspierającym decyzje biznesowe partnerów. Analizujesz kontekst rozmowy i podejmujesz JEDNĄ decyzję: DZIAŁAJ lub POCZEKAJ.');

-- Insert predefined contact types
INSERT INTO public.ai_compass_contact_types (name, description, icon_name, is_system, position) VALUES
('Nowy kontakt', 'Pierwsza rozmowa z potencjalnym klientem', 'UserPlus', true, 1),
('Powracający klient', 'Kontakt z istniejącym klientem', 'UserCheck', true, 2),
('Zimny lead', 'Kontakt bez wcześniejszej relacji', 'Snowflake', true, 3),
('Polecenie', 'Kontakt z polecenia', 'Share2', true, 4),
('Partnerstwo biznesowe', 'Propozycja współpracy B2B', 'Handshake', true, 5),
('Event/Networking', 'Kontakt z eventu lub networkingu', 'Calendar', true, 6),
('Social media', 'Kontakt przez media społecznościowe', 'Globe', true, 7),
('Telefon', 'Kontakt telefoniczny', 'Phone', true, 8);

-- Insert default stages for each contact type
INSERT INTO public.ai_compass_contact_stages (contact_type_id, name, position)
SELECT id, 'Pierwszy kontakt', 1 FROM public.ai_compass_contact_types;
INSERT INTO public.ai_compass_contact_stages (contact_type_id, name, position)
SELECT id, 'Follow-up', 2 FROM public.ai_compass_contact_types;
INSERT INTO public.ai_compass_contact_stages (contact_type_id, name, position)
SELECT id, 'Prezentacja', 3 FROM public.ai_compass_contact_types;
INSERT INTO public.ai_compass_contact_stages (contact_type_id, name, position)
SELECT id, 'Negocjacje', 4 FROM public.ai_compass_contact_types;
INSERT INTO public.ai_compass_contact_stages (contact_type_id, name, position)
SELECT id, 'Zamknięcie', 5 FROM public.ai_compass_contact_types;

-- Update trigger
CREATE TRIGGER update_ai_compass_settings_updated_at BEFORE UPDATE ON public.ai_compass_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_compass_contact_types_updated_at BEFORE UPDATE ON public.ai_compass_contact_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_compass_sessions_updated_at BEFORE UPDATE ON public.ai_compass_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();