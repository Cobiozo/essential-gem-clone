-- Create support_settings table for CMS-editable support form
CREATE TABLE public.support_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Header section
  header_title text DEFAULT 'Wsparcie techniczne',
  header_description text DEFAULT 'Masz pytania? Skontaktuj się z naszym zespołem wsparcia.',
  
  -- Email card
  email_address text DEFAULT 'support@purelife.info.pl',
  email_label text DEFAULT 'Email',
  email_icon text DEFAULT 'Mail',
  
  -- Phone card
  phone_number text DEFAULT '+48 123 456 789',
  phone_label text DEFAULT 'Telefon',
  phone_icon text DEFAULT 'Phone',
  
  -- Working hours card
  working_hours text DEFAULT 'Pon-Pt: 09:00-14:00',
  working_hours_label text DEFAULT 'Godziny pracy',
  working_hours_icon text DEFAULT 'Clock',
  
  -- Info box
  info_box_title text DEFAULT 'Informacja',
  info_box_content text DEFAULT 'W przypadku dużej ilości zgłoszeń odpowiedź może potrwać do 24h. W pilnych sprawach zalecamy kontakt telefoniczny.',
  info_box_icon text DEFAULT 'Clock',
  
  -- Form section
  form_title text DEFAULT 'Napisz do nas',
  name_label text DEFAULT 'Imię i nazwisko',
  name_placeholder text DEFAULT 'Jan Kowalski',
  email_field_label text DEFAULT 'Email',
  email_placeholder text DEFAULT 'jan@example.com',
  subject_label text DEFAULT 'Temat',
  subject_placeholder text DEFAULT 'W czym możemy pomóc?',
  message_label text DEFAULT 'Wiadomość',
  message_placeholder text DEFAULT 'Opisz swoje pytanie lub problem...',
  submit_button_text text DEFAULT 'Wyślij wiadomość',
  
  -- Response messages
  success_message text DEFAULT 'Wiadomość wysłana! Odpowiemy najszybciej jak to możliwe.',
  error_message text DEFAULT 'Nie udało się wysłać wiadomości. Spróbuj ponownie.',
  
  -- Settings
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view support settings
CREATE POLICY "Everyone can view support settings"
  ON public.support_settings
  FOR SELECT
  USING (true);

-- Only admins can manage support settings
CREATE POLICY "Admins can insert support settings"
  ON public.support_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update support settings"
  ON public.support_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete support settings"
  ON public.support_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default record
INSERT INTO public.support_settings (id) VALUES (gen_random_uuid());

-- Create trigger for updated_at
CREATE TRIGGER update_support_settings_updated_at
  BEFORE UPDATE ON public.support_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();