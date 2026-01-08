-- Tabela trybu serwisowego
CREATE TABLE public.maintenance_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT false,
  title TEXT DEFAULT 'Przerwa techniczna',
  message TEXT DEFAULT 'Trwają prace serwisowe. Prosimy o cierpliwość.',
  planned_end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wstaw domyślny rekord
INSERT INTO public.maintenance_mode (is_enabled, title, message) 
VALUES (false, 'Przerwa techniczna', 'Trwają prace serwisowe. Prosimy o cierpliwość.');

-- Polityka RLS
ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Wszyscy mogą czytać (potrzebne do sprawdzenia stanu na stronie logowania)
CREATE POLICY "Wszyscy mogą czytać tryb serwisowy" ON public.maintenance_mode
  FOR SELECT USING (true);

-- Tylko admini mogą modyfikować
CREATE POLICY "Tylko admini mogą modyfikować tryb serwisowy" ON public.maintenance_mode
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger do aktualizacji updated_at
CREATE TRIGGER update_maintenance_mode_updated_at
BEFORE UPDATE ON public.maintenance_mode
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Włącz realtime dla tej tabeli
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_mode;