-- Create cookie consent settings table (global settings)
CREATE TABLE public.cookie_consent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  consent_template TEXT NOT NULL DEFAULT 'gdpr',
  geo_targeting_enabled BOOLEAN NOT NULL DEFAULT false,
  geo_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
  consent_expiration_days INTEGER NOT NULL DEFAULT 365,
  reload_on_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cookie banner settings table (appearance)
CREATE TABLE public.cookie_banner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_type TEXT NOT NULL DEFAULT 'box',
  position TEXT NOT NULL DEFAULT 'bottom-left',
  preference_center_type TEXT NOT NULL DEFAULT 'center',
  title TEXT DEFAULT 'Ta strona używa plików cookie',
  message TEXT DEFAULT 'Używamy plików cookie, aby zapewnić najlepsze wrażenia z korzystania z naszej strony.',
  privacy_policy_url TEXT,
  show_close_button BOOLEAN NOT NULL DEFAULT true,
  show_accept_all BOOLEAN NOT NULL DEFAULT true,
  show_reject_all BOOLEAN NOT NULL DEFAULT true,
  show_customize BOOLEAN NOT NULL DEFAULT true,
  accept_all_text TEXT DEFAULT 'Akceptuj wszystkie',
  reject_all_text TEXT DEFAULT 'Odrzuć wszystkie',
  customize_text TEXT DEFAULT 'Dostosuj',
  read_more_text TEXT DEFAULT 'Polityka prywatności',
  save_preferences_text TEXT DEFAULT 'Zapisz preferencje',
  categories_on_first_layer BOOLEAN NOT NULL DEFAULT false,
  custom_logo_url TEXT,
  show_branding BOOLEAN NOT NULL DEFAULT false,
  revisit_button_enabled BOOLEAN NOT NULL DEFAULT true,
  revisit_button_position TEXT NOT NULL DEFAULT 'bottom-left',
  revisit_button_text TEXT DEFAULT 'Ustawienia cookies',
  theme TEXT NOT NULL DEFAULT 'light',
  colors JSONB DEFAULT '{
    "background": "#ffffff",
    "border": "#e5e7eb",
    "title": "#1f2937",
    "text": "#4b5563",
    "buttonPrimaryBg": "#10b981",
    "buttonPrimaryText": "#ffffff",
    "buttonSecondaryBg": "#f3f4f6",
    "buttonSecondaryText": "#374151",
    "toggleOn": "#10b981",
    "toggleOff": "#d1d5db",
    "link": "#10b981"
  }'::jsonb,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cookie categories table
CREATE TABLE public.cookie_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_necessary BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  load_before_consent BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user cookie consents table (visitor consents)
CREATE TABLE public.user_cookie_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  ip_address_hash TEXT,
  consents JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cookie_consent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_banner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cookie_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cookie_consent_settings
CREATE POLICY "Everyone can view cookie consent settings" ON public.cookie_consent_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage cookie consent settings" ON public.cookie_consent_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- RLS Policies for cookie_banner_settings
CREATE POLICY "Everyone can view cookie banner settings" ON public.cookie_banner_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage cookie banner settings" ON public.cookie_banner_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- RLS Policies for cookie_categories
CREATE POLICY "Everyone can view cookie categories" ON public.cookie_categories
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage cookie categories" ON public.cookie_categories
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- RLS Policies for user_cookie_consents
CREATE POLICY "Anyone can insert cookie consents" ON public.user_cookie_consents
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all cookie consents" ON public.user_cookie_consents
  FOR SELECT USING (is_admin());

-- Create indexes
CREATE INDEX idx_cookie_categories_position ON public.cookie_categories(position);
CREATE INDEX idx_user_cookie_consents_visitor_id ON public.user_cookie_consents(visitor_id);
CREATE INDEX idx_user_cookie_consents_consent_given_at ON public.user_cookie_consents(consent_given_at);

-- Insert default categories
INSERT INTO public.cookie_categories (name, description, is_necessary, is_enabled, position) VALUES
  ('Niezbędne', 'Te pliki cookie są wymagane do podstawowego funkcjonowania strony i nie mogą być wyłączone.', true, true, 0),
  ('Funkcjonalne', 'Te pliki cookie umożliwiają lepsze funkcje i personalizację.', false, true, 1),
  ('Analityczne', 'Te pliki cookie pomagają nam zrozumieć, jak odwiedzający korzystają z naszej strony.', false, true, 2),
  ('Marketingowe', 'Te pliki cookie są używane do wyświetlania spersonalizowanych reklam.', false, true, 3);

-- Insert default settings
INSERT INTO public.cookie_consent_settings (is_active) VALUES (false);
INSERT INTO public.cookie_banner_settings (layout_type) VALUES ('box');

-- Triggers for updated_at
CREATE TRIGGER update_cookie_consent_settings_updated_at
  BEFORE UPDATE ON public.cookie_consent_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cookie_banner_settings_updated_at
  BEFORE UPDATE ON public.cookie_banner_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cookie_categories_updated_at
  BEFORE UPDATE ON public.cookie_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();