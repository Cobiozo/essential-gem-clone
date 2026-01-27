-- Nowa tabela: wybór konkretnych wydarzeń przez admina
CREATE TABLE public.news_ticker_selected_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  custom_label text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_ticker_selected_events ENABLE ROW LEVEL SECURITY;

-- Polityka: tylko admini mogą zarządzać
CREATE POLICY "Admins can manage selected events"
ON public.news_ticker_selected_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Polityka: wszyscy zalogowani mogą odczytywać włączone wydarzenia
CREATE POLICY "Authenticated users can read enabled selected events"
ON public.news_ticker_selected_events
FOR SELECT
USING (is_enabled = true AND auth.role() = 'authenticated');

-- Rozszerzenie news_ticker_items o nowe kolumny
ALTER TABLE public.news_ticker_items 
  ADD COLUMN IF NOT EXISTS target_user_id uuid,
  ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS custom_color text,
  ADD COLUMN IF NOT EXISTS effect text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS icon_animation text DEFAULT 'none';

-- Dodanie constraints jako triggery walidacyjne zamiast CHECK (dla zgodności z restore)
CREATE OR REPLACE FUNCTION public.validate_news_ticker_item_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.font_size IS NOT NULL AND NEW.font_size NOT IN ('normal', 'large', 'xlarge') THEN
    RAISE EXCEPTION 'font_size must be one of: normal, large, xlarge';
  END IF;
  IF NEW.effect IS NOT NULL AND NEW.effect NOT IN ('none', 'blink', 'pulse', 'glow') THEN
    RAISE EXCEPTION 'effect must be one of: none, blink, pulse, glow';
  END IF;
  IF NEW.icon_animation IS NOT NULL AND NEW.icon_animation NOT IN ('none', 'bounce', 'spin', 'shake') THEN
    RAISE EXCEPTION 'icon_animation must be one of: none, bounce, spin, shake';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_news_ticker_item_fields_trigger
BEFORE INSERT OR UPDATE ON public.news_ticker_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_news_ticker_item_fields();