-- Table for admin settings
CREATE TABLE public.daily_signal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  visible_to_clients BOOLEAN NOT NULL DEFAULT true,
  visible_to_partners BOOLEAN NOT NULL DEFAULT true,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT true,
  generation_mode TEXT NOT NULL DEFAULT 'semi_auto',
  ai_tone TEXT DEFAULT 'supportive',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for signals library
CREATE TABLE public.daily_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_message TEXT NOT NULL,
  explanation TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_used BOOLEAN NOT NULL DEFAULT false,
  scheduled_date DATE,
  generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for user preferences
CREATE TABLE public.user_signal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  show_daily_signal BOOLEAN NOT NULL DEFAULT true,
  last_signal_shown_at TIMESTAMPTZ,
  last_signal_id UUID REFERENCES public.daily_signals(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_signal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signal_preferences ENABLE ROW LEVEL SECURITY;

-- RLS for daily_signal_settings
CREATE POLICY "Admins can manage daily signal settings"
ON public.daily_signal_settings FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Everyone can view daily signal settings"
ON public.daily_signal_settings FOR SELECT
USING (true);

-- RLS for daily_signals
CREATE POLICY "Admins can manage daily signals"
ON public.daily_signals FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view approved signals"
ON public.daily_signals FOR SELECT
USING (is_approved = true AND auth.uid() IS NOT NULL);

-- RLS for user_signal_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_signal_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences"
ON public.user_signal_preferences FOR SELECT
USING (public.is_admin());

-- Insert default settings
INSERT INTO public.daily_signal_settings (is_enabled, visible_to_clients, visible_to_partners, visible_to_specjalista, generation_mode, ai_tone)
VALUES (true, true, true, true, 'semi_auto', 'supportive');

-- Trigger for updated_at
CREATE TRIGGER update_daily_signal_settings_updated_at
BEFORE UPDATE ON public.daily_signal_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_signals_updated_at
BEFORE UPDATE ON public.daily_signals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_signal_preferences_updated_at
BEFORE UPDATE ON public.user_signal_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();