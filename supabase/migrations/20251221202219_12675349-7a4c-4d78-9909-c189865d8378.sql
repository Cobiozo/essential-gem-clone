-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  internal_name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  footer_html TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_event_types table
CREATE TABLE public.email_event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_template_events junction table
CREATE TABLE public.email_template_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES public.email_event_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, event_type_id)
);

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  event_type_id UUID REFERENCES public.email_event_types(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active email templates" ON public.email_templates
  FOR SELECT USING (is_active = true);

-- RLS policies for email_event_types
CREATE POLICY "Admins can manage email event types" ON public.email_event_types
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active email event types" ON public.email_event_types
  FOR SELECT USING (is_active = true);

-- RLS policies for email_template_events
CREATE POLICY "Admins can manage email template events" ON public.email_template_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view email template events" ON public.email_template_events
  FOR SELECT USING (true);

-- RLS policies for email_logs
CREATE POLICY "Admins can manage email logs" ON public.email_logs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can view all email logs" ON public.email_logs
  FOR SELECT USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default event types
INSERT INTO public.email_event_types (event_key, name, description) VALUES
  ('user_registration', 'Rejestracja użytkownika', 'Wysyłany po rejestracji nowego użytkownika'),
  ('account_activation', 'Aktywacja konta', 'Wysyłany z linkiem aktywacyjnym'),
  ('first_login', 'Pierwsze logowanie', 'Wysyłany po pierwszym zalogowaniu'),
  ('password_reset', 'Reset hasła', 'Wysyłany przy resetowaniu hasła'),
  ('password_changed', 'Zmiana hasła', 'Powiadomienie o zmianie hasła'),
  ('admin_action', 'Akcja administracyjna', 'Wysyłany przez administratora'),
  ('reminder', 'Przypomnienie', 'Przypomnienia systemowe');

-- Insert default activation email template
INSERT INTO public.email_templates (name, internal_name, subject, body_html, body_text, variables) VALUES
  (
    'E-mail aktywacyjny',
    'activation_email',
    'Aktywuj swoje konto w Pure Life',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #10b981;">Witaj {{imię}}!</h1>
      <p>Dziękujemy za rejestrację w Pure Life.</p>
      <p>Aby aktywować swoje konto, kliknij poniższy przycisk:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{link_aktywacyjny}}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Aktywuj konto</a>
      </p>
      <p>Jeśli przycisk nie działa, skopiuj i wklej ten link w przeglądarce:</p>
      <p style="word-break: break-all; color: #666;">{{link_aktywacyjny}}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">Jeśli nie rejestrowałeś/aś się w Pure Life, zignoruj tę wiadomość.</p>
    </div>',
    'Witaj {{imię}}!

Dziękujemy za rejestrację w Pure Life.

Aby aktywować swoje konto, kliknij poniższy link:
{{link_aktywacyjny}}

Jeśli nie rejestrowałeś/aś się w Pure Life, zignoruj tę wiadomość.',
    '[{"name": "imię", "description": "Imię użytkownika"}, {"name": "nazwisko", "description": "Nazwisko użytkownika"}, {"name": "email", "description": "Adres e-mail"}, {"name": "link_aktywacyjny", "description": "Link do aktywacji konta"}, {"name": "rola", "description": "Rola użytkownika"}]'
  );

-- Link activation email to registration event
INSERT INTO public.email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM public.email_templates t, public.email_event_types e
WHERE t.internal_name = 'activation_email' AND e.event_key = 'user_registration';