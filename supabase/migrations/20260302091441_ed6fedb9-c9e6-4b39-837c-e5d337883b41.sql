
-- Faza 1: Tabele i uprawnienia dla stron landingowych liderów

-- 1. Nowa kolumna w leader_permissions
ALTER TABLE public.leader_permissions 
ADD COLUMN can_customize_landing_page boolean NOT NULL DEFAULT false;

-- 2. Tabela leader_landing_pages
CREATE TABLE public.leader_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  eq_id text NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_title text DEFAULT 'Moja strona',
  page_description text,
  theme_color text DEFAULT '#10b981',
  logo_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leader_landing_pages_user_id_key UNIQUE (user_id),
  CONSTRAINT leader_landing_pages_eq_id_key UNIQUE (eq_id)
);

-- 3. Tabela leader_landing_analytics
CREATE TABLE public.leader_landing_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.leader_landing_pages(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  visitor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Trigger updated_at dla leader_landing_pages
CREATE TRIGGER update_leader_landing_pages_updated_at
  BEFORE UPDATE ON public.leader_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- 5. Indeksy
CREATE INDEX idx_leader_landing_pages_eq_id ON public.leader_landing_pages(eq_id);
CREATE INDEX idx_leader_landing_pages_active ON public.leader_landing_pages(is_active) WHERE is_active = true;
CREATE INDEX idx_leader_landing_analytics_page_id ON public.leader_landing_analytics(page_id);
CREATE INDEX idx_leader_landing_analytics_created_at ON public.leader_landing_analytics(created_at);

-- 6. RLS dla leader_landing_pages
ALTER TABLE public.leader_landing_pages ENABLE ROW LEVEL SECURITY;

-- Właściciel może wszystko ze swoją stroną
CREATE POLICY "Owner can manage own landing page"
  ON public.leader_landing_pages
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anonimowi mogą czytać aktywne strony
CREATE POLICY "Anyone can read active landing pages"
  ON public.leader_landing_pages
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Zalogowani też mogą czytać aktywne strony (np. podgląd)
CREATE POLICY "Authenticated can read active landing pages"
  ON public.leader_landing_pages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admini mogą czytać wszystkie strony
CREATE POLICY "Admins can read all landing pages"
  ON public.leader_landing_pages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS dla leader_landing_analytics
ALTER TABLE public.leader_landing_analytics ENABLE ROW LEVEL SECURITY;

-- Anonimowi mogą insertować (rejestracja zdarzeń)
CREATE POLICY "Anyone can insert analytics"
  ON public.leader_landing_analytics
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Zalogowani też mogą insertować
CREATE POLICY "Authenticated can insert analytics"
  ON public.leader_landing_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Właściciel strony może czytać swoje statystyki
CREATE POLICY "Page owner can read analytics"
  ON public.leader_landing_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leader_landing_pages llp
      WHERE llp.id = page_id AND llp.user_id = auth.uid()
    )
  );

-- Admini mogą czytać wszystkie statystyki
CREATE POLICY "Admins can read all analytics"
  ON public.leader_landing_analytics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
