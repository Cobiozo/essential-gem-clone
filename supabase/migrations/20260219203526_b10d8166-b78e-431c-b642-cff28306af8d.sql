
-- Create data_cleanup_settings table
CREATE TABLE IF NOT EXISTS public.data_cleanup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  table_name text NOT NULL,
  extra_condition text,
  retention_days integer NOT NULL DEFAULT 90,
  is_auto_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.data_cleanup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cleanup settings"
  ON public.data_cleanup_settings
  FOR ALL
  USING (public.is_admin());

CREATE TRIGGER update_data_cleanup_settings_updated_at
  BEFORE UPDATE ON public.data_cleanup_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.data_cleanup_settings (category_key, label, description, table_name, extra_condition, retention_days, is_auto_enabled) VALUES
  ('email_logs', 'Logi emaili', 'Logi wysłanych wiadomości email z systemu', 'email_logs', NULL, 90, false),
  ('google_calendar_sync_logs', 'Logi synchronizacji Google Calendar', 'Techniczne logi synchronizacji z Google Calendar', 'google_calendar_sync_logs', NULL, 30, false),
  ('cron_job_logs', 'Logi zadań Cron', 'Logi wykonania automatycznych zadań cron', 'cron_job_logs', NULL, 30, false),
  ('past_events', 'Minione wydarzenia', 'Zakończone wydarzenia i ich rejestracje (kaskadowo)', 'events', 'end_time < NOW()', 90, false),
  ('read_notifications', 'Przeczytane powiadomienia', 'Powiadomienia użytkowników oznaczone jako przeczytane', 'user_notifications', 'is_read = true', 60, false),
  ('banner_interactions', 'Interakcje z banerami', 'Dane analityczne o interakcjach użytkowników z banerami', 'banner_interactions', NULL, 60, false),
  ('push_notification_logs', 'Logi push notyfikacji', 'Logi wysłanych powiadomień push', 'push_notification_logs', NULL, 30, false),
  ('medical_chat_history', 'Historia czatu AI medycznego', 'Historia rozmów z asystentem medycznym AI (dane sensytywne)', 'medical_chat_history', NULL, 180, false),
  ('ai_compass_history', 'Historia AI Compass', 'Historia zmian kontaktów w systemie AI Compass', 'ai_compass_contact_history', NULL, 90, false),
  ('reflink_events', 'Zdarzenia linków referencyjnych', 'Logi kliknięć i rejestracji przez linki polecające', 'reflink_events', NULL, 90, false)
ON CONFLICT (category_key) DO NOTHING;
