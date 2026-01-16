-- Faza 1: Nowe kolumny w tabeli events dla integracji Zoom API
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_meeting_id text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_start_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_password text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_generated_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_auto_generated boolean DEFAULT false;

COMMENT ON COLUMN events.zoom_meeting_id IS 'ID spotkania Zoom z API';
COMMENT ON COLUMN events.zoom_start_url IS 'URL startowy dla hosta (pełne uprawnienia)';
COMMENT ON COLUMN events.zoom_password IS 'Hasło spotkania Zoom';
COMMENT ON COLUMN events.zoom_auto_generated IS 'Czy link wygenerowany przez API';
COMMENT ON COLUMN events.zoom_generated_at IS 'Czas wygenerowania spotkania przez API';

-- Faza 1: Nowa tabela zoom_integration_settings
CREATE TABLE IF NOT EXISTS public.zoom_integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_configured boolean DEFAULT false,
  default_host_email text,
  default_waiting_room boolean DEFAULT true,
  default_auto_recording text DEFAULT 'none',
  default_mute_on_entry boolean DEFAULT true,
  last_api_check_at timestamptz,
  api_status text DEFAULT 'not_configured',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Polityki RLS dla zoom_integration_settings
ALTER TABLE public.zoom_integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage zoom settings" ON public.zoom_integration_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Everyone view zoom settings" ON public.zoom_integration_settings
  FOR SELECT USING (true);

-- Wstaw domyślny rekord ustawień
INSERT INTO public.zoom_integration_settings (id, is_configured, api_status)
VALUES (gen_random_uuid(), false, 'not_configured')
ON CONFLICT DO NOTHING;