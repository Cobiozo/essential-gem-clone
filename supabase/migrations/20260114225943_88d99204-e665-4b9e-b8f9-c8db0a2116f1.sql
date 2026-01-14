-- Create dashboard_footer_settings table for editable dashboard footer content
CREATE TABLE public.dashboard_footer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quote/mission section
  quote_text TEXT DEFAULT 'W Pure Life wierzymy, że prawdziwa zmiana zaczyna się od troski o zdrowie.',
  mission_statement TEXT DEFAULT 'Naszą misją jest wspieranie każdego w drodze do lepszego życia poprzez naturalne rozwiązania i wzajemną pomoc.',
  
  -- Team section
  team_title TEXT DEFAULT 'Zespół Pure Life',
  team_description TEXT DEFAULT 'Jesteśmy grupą pasjonatów zdrowego stylu życia, którzy wierzą w siłę naturalnych rozwiązań.',
  
  -- Feature cards (3)
  feature_1_icon TEXT DEFAULT 'Heart',
  feature_1_title TEXT DEFAULT 'Pasja',
  feature_1_description TEXT DEFAULT 'Działamy z serca, wspierając każdego w drodze do zdrowia.',
  
  feature_2_icon TEXT DEFAULT 'Users',
  feature_2_title TEXT DEFAULT 'Społeczność',
  feature_2_description TEXT DEFAULT 'Razem tworzymy wspólnotę wzajemnego wsparcia.',
  
  feature_3_icon TEXT DEFAULT 'Check',
  feature_3_title TEXT DEFAULT 'Misja',
  feature_3_description TEXT DEFAULT 'Inspirujemy i wspieramy zdrowy styl życia.',
  
  -- Contact section
  contact_title TEXT DEFAULT 'KONTAKT',
  contact_description TEXT DEFAULT 'Masz pytania? Chętnie pomożemy!',
  contact_reminder TEXT DEFAULT 'Pamiętaj, że w pierwszej kolejności zawsze możesz skontaktować się ze swoim opiekunem w zespole.',
  contact_email_label TEXT DEFAULT 'Email Support Pure Life',
  contact_email_address TEXT DEFAULT 'kontakt@purelife.info.pl',
  contact_icon TEXT DEFAULT 'Mail',
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_footer_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Everyone can read dashboard footer settings"
  ON public.dashboard_footer_settings FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert dashboard footer settings"
  ON public.dashboard_footer_settings FOR INSERT 
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update dashboard footer settings"
  ON public.dashboard_footer_settings FOR UPDATE 
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete dashboard footer settings"
  ON public.dashboard_footer_settings FOR DELETE 
  USING (public.get_current_user_role() = 'admin');

-- Insert default record
INSERT INTO public.dashboard_footer_settings (id) VALUES (gen_random_uuid());

-- Add comment
COMMENT ON TABLE public.dashboard_footer_settings IS 'Stores editable content for the dashboard footer section (Team Pure Life, Contact)';