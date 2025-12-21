-- Create feature visibility management table
CREATE TABLE public.feature_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  feature_category text NOT NULL DEFAULT 'general',
  description text,
  visible_to_admin boolean NOT NULL DEFAULT true,
  visible_to_partner boolean NOT NULL DEFAULT true,
  visible_to_client boolean NOT NULL DEFAULT true,
  visible_to_specjalista boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_visibility ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage feature visibility"
ON public.feature_visibility
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Everyone can view feature visibility"
ON public.feature_visibility
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_feature_visibility_updated_at
BEFORE UPDATE ON public.feature_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default features (main app features)
INSERT INTO public.feature_visibility (feature_key, feature_name, feature_category, description, position) VALUES
-- Menu główne
('menu.training', 'Szkolenia', 'menu', 'Dostęp do modułu szkoleń', 1),
('menu.knowledge', 'Baza wiedzy', 'menu', 'Dostęp do centrum wiedzy', 2),
('menu.my_account', 'Moje konto', 'menu', 'Dostęp do panelu użytkownika', 3),
('menu.admin', 'Panel admina', 'menu', 'Dostęp do panelu administratora', 4),

-- Moje konto - zakładki
('my_account.profile', 'Profil', 'my_account', 'Zakładka profilu użytkownika', 10),
('my_account.team_contacts', 'Moja lista kontaktów', 'my_account', 'Zakładka listy kontaktów zespołu', 11),
('my_account.specialist_search', 'Wyszukiwarka specjalistów', 'my_account', 'Zakładka wyszukiwarki specjalistów', 12),
('my_account.correspondence', 'Korespondencja', 'my_account', 'Zakładka korespondencji ze specjalistami', 13),
('my_account.ai_compass', 'AI Kompas', 'my_account', 'Zakładka AI Kompas', 14),
('my_account.certificates', 'Certyfikaty', 'my_account', 'Zakładka certyfikatów', 15),

-- Funkcje
('feature.reflinks', 'Reflinki', 'feature', 'Dostęp do reflinek', 20),
('feature.notifications', 'Powiadomienia', 'feature', 'Dostęp do systemu powiadomień', 21),
('feature.daily_signal', 'Sygnał dnia', 'feature', 'Wyświetlanie sygnału dnia', 22),
('feature.important_info', 'Ważne informacje', 'feature', 'Wyświetlanie ważnych informacji', 23),
('feature.medical_chat', 'Asystent medyczny', 'feature', 'Dostęp do czatu medycznego', 24),
('feature.support_chat', 'Czat wsparcia', 'feature', 'Dostęp do czatu wsparcia', 25),
('feature.team_map', 'Mapa zespołu', 'feature', 'Dostęp do mapy zespołu', 26),
('feature.team_export', 'Eksport kontaktów', 'feature', 'Możliwość eksportu kontaktów', 27),

-- Akcje
('action.send_specialist_message', 'Wyślij wiadomość do specjalisty', 'action', 'Możliwość wysyłania wiadomości do specjalistów', 30),
('action.add_contact', 'Dodaj kontakt', 'action', 'Możliwość dodawania kontaktów', 31),
('action.edit_contact', 'Edytuj kontakt', 'action', 'Możliwość edycji kontaktów', 32),
('action.delete_contact', 'Usuń kontakt', 'action', 'Możliwość usuwania kontaktów', 33);

-- Set admin-only features
UPDATE public.feature_visibility 
SET visible_to_client = false, visible_to_partner = false, visible_to_specjalista = false 
WHERE feature_key = 'menu.admin';