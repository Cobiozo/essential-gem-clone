-- Sekcje treści dla wydarzeń płatnych (CMS)
CREATE TABLE public.paid_event_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.paid_events(id) ON DELETE CASCADE,
  section_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  content text,
  position int DEFAULT 0,
  is_active boolean DEFAULT true,
  background_color text,
  text_color text,
  icon_name text,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indeks dla szybszego pobierania sekcji
CREATE INDEX idx_paid_event_content_sections_event ON public.paid_event_content_sections(event_id);
CREATE INDEX idx_paid_event_content_sections_position ON public.paid_event_content_sections(event_id, position);

-- RLS
ALTER TABLE public.paid_event_content_sections ENABLE ROW LEVEL SECURITY;

-- Publiczny odczyt dla opublikowanych wydarzeń
CREATE POLICY "Public read content sections for published events" 
ON public.paid_event_content_sections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paid_events 
    WHERE id = event_id AND is_published = true AND is_active = true
  )
);

-- Pełny dostęp dla adminów
CREATE POLICY "Admin full access to content sections" 
ON public.paid_event_content_sections
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Rozszerzenie tabeli biletów o benefity i wyróżnienie
ALTER TABLE public.paid_event_tickets 
  ADD COLUMN IF NOT EXISTS benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlight_text text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Trigger dla updated_at
CREATE TRIGGER update_paid_event_content_sections_updated_at
  BEFORE UPDATE ON public.paid_event_content_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();