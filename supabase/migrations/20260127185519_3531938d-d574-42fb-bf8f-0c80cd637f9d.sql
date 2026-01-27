-- =============================================
-- NEWS TICKER: Settings and Items tables
-- =============================================

-- Table for global ticker settings
CREATE TABLE public.news_ticker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  
  -- Visibility per role
  visible_to_clients boolean DEFAULT true,
  visible_to_partners boolean DEFAULT true,
  visible_to_specjalista boolean DEFAULT true,
  
  -- Data sources (which are enabled)
  source_webinars boolean DEFAULT true,
  source_team_meetings boolean DEFAULT true,
  source_announcements boolean DEFAULT true,
  source_important_banners boolean DEFAULT false,
  
  -- Animation settings
  animation_mode text DEFAULT 'scroll' CHECK (animation_mode IN ('scroll', 'rotate', 'static')),
  scroll_speed integer DEFAULT 50,
  rotate_interval integer DEFAULT 5,
  
  -- Styling
  background_color text DEFAULT NULL,
  text_color text DEFAULT NULL,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table for manual ticker items/announcements
CREATE TABLE public.news_ticker_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  content text NOT NULL,
  short_description text,
  icon text DEFAULT 'info',
  thumbnail_url text,
  link_url text,
  
  -- Visibility
  is_active boolean DEFAULT true,
  visible_to_clients boolean DEFAULT true,
  visible_to_partners boolean DEFAULT true,
  visible_to_specjalista boolean DEFAULT true,
  
  -- Priority and highlighting
  priority integer DEFAULT 0,
  is_important boolean DEFAULT false,
  
  -- Schedule
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.news_ticker_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_ticker_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Authenticated users can read ticker settings" 
  ON public.news_ticker_settings 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage ticker settings" 
  ON public.news_ticker_settings 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin());

-- RLS Policies for items
CREATE POLICY "Authenticated users can read active ticker items" 
  ON public.news_ticker_items 
  FOR SELECT 
  TO authenticated 
  USING (is_active = true);

CREATE POLICY "Admins can manage ticker items" 
  ON public.news_ticker_items 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin());

-- Insert default settings
INSERT INTO public.news_ticker_settings (id) 
VALUES (gen_random_uuid());

-- Trigger for updated_at on settings
CREATE TRIGGER update_news_ticker_settings_updated_at
  BEFORE UPDATE ON public.news_ticker_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on items
CREATE TRIGGER update_news_ticker_items_updated_at
  BEFORE UPDATE ON public.news_ticker_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();