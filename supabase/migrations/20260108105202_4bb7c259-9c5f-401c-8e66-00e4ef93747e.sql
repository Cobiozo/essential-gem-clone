-- Tabela do logowania wydarzeń reflinków (kliknięcia i rejestracje w czasie)
CREATE TABLE public.reflink_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflink_id UUID NOT NULL REFERENCES public.user_reflinks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Walidacja event_type przez trigger zamiast CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_reflink_event_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type NOT IN ('click', 'registration') THEN
    RAISE EXCEPTION 'event_type must be click or registration';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_reflink_event_type_trigger
BEFORE INSERT OR UPDATE ON public.reflink_events
FOR EACH ROW EXECUTE FUNCTION public.validate_reflink_event_type();

-- Indeksy dla wydajności zapytań analitycznych
CREATE INDEX idx_reflink_events_reflink_id ON public.reflink_events(reflink_id);
CREATE INDEX idx_reflink_events_created_at ON public.reflink_events(created_at);
CREATE INDEX idx_reflink_events_type ON public.reflink_events(event_type);

-- RLS - użytkownik widzi tylko wydarzenia swoich reflinków
ALTER TABLE public.reflink_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their own reflinks"
ON public.reflink_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_reflinks ur
    WHERE ur.id = reflink_events.reflink_id
    AND ur.creator_user_id = auth.uid()
  )
);

-- Polityka INSERT dla anonimowych użytkowników (kliknięcia) i systemu
CREATE POLICY "Anyone can insert click events"
ON public.reflink_events FOR INSERT
WITH CHECK (event_type = 'click');

-- Aktualizacja triggera rejestracji aby logować wydarzenie
CREATE OR REPLACE FUNCTION public.handle_user_reflink_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_reflink_code TEXT;
  v_reflink_id UUID;
BEGIN
  -- Get the reflink code from the new user's metadata
  v_reflink_code := NEW.raw_user_meta_data->>'reflink_code';
  
  IF v_reflink_code IS NOT NULL THEN
    -- Find the reflink and increment registration count
    UPDATE public.user_reflinks
    SET registration_count = registration_count + 1
    WHERE reflink_code = v_reflink_code
      AND is_active = true
    RETURNING id INTO v_reflink_id;
    
    -- Log the registration event
    IF v_reflink_id IS NOT NULL THEN
      INSERT INTO public.reflink_events (reflink_id, event_type, target_role)
      VALUES (v_reflink_id, 'registration', NEW.raw_user_meta_data->>'role');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;