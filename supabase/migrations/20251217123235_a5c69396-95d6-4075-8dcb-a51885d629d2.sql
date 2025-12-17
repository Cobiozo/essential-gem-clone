
-- Add display frequency to daily_signal_settings
ALTER TABLE public.daily_signal_settings 
ADD COLUMN IF NOT EXISTS display_frequency text NOT NULL DEFAULT 'daily'
CHECK (display_frequency IN ('daily', 'every_login'));

-- Create important_info_banners table
CREATE TABLE public.important_info_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Ważna Informacja',
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  visible_to_clients boolean NOT NULL DEFAULT true,
  visible_to_partners boolean NOT NULL DEFAULT true,
  visible_to_specjalista boolean NOT NULL DEFAULT true,
  display_frequency text NOT NULL DEFAULT 'once' CHECK (display_frequency IN ('once', 'every_login')),
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.important_info_banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage important info banners"
ON public.important_info_banners
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active banners"
ON public.important_info_banners
FOR SELECT
USING (is_active = true);

-- User dismissed banners tracking
CREATE TABLE public.user_dismissed_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banner_id uuid NOT NULL REFERENCES public.important_info_banners(id) ON DELETE CASCADE,
  dismissed_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, banner_id)
);

ALTER TABLE public.user_dismissed_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dismissals"
ON public.user_dismissed_banners
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
