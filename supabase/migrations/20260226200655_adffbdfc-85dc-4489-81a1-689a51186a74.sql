
-- Tabela historii czynności liderów w obszarze zespołów
CREATE TABLE public.platform_team_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'rename_team' | 'toggle_independence'
  target_team_leader_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.platform_team_actions ENABLE ROW LEVEL SECURITY;

-- Admini mogą widzieć wszystko
CREATE POLICY "Admins can select all team actions"
ON public.platform_team_actions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Liderzy mogą widzieć swoje akcje
CREATE POLICY "Leaders can select own actions"
ON public.platform_team_actions
FOR SELECT
TO authenticated
USING (leader_user_id = auth.uid());

-- Liderzy mogą wstawiać swoje akcje
CREATE POLICY "Leaders can insert own actions"
ON public.platform_team_actions
FOR INSERT
TO authenticated
WITH CHECK (leader_user_id = auth.uid());

-- Admini mogą wstawiać akcje
CREATE POLICY "Admins can insert team actions"
ON public.platform_team_actions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indeks na created_at dla paginacji
CREATE INDEX idx_platform_team_actions_created_at ON public.platform_team_actions(created_at DESC);

-- Dodaj politykę SELECT na platform_teams dla liderów (żeby mogli czytać swój zespół)
CREATE POLICY "Leaders can select own team"
ON public.platform_teams
FOR SELECT
TO authenticated
USING (leader_user_id = auth.uid());

-- Dodaj politykę INSERT/UPDATE na platform_teams dla liderów (żeby mogli edytować swój zespół)
CREATE POLICY "Leaders can upsert own team"
ON public.platform_teams
FOR INSERT
TO authenticated
WITH CHECK (leader_user_id = auth.uid());

CREATE POLICY "Leaders can update own team"
ON public.platform_teams
FOR UPDATE
TO authenticated
USING (leader_user_id = auth.uid());

-- Liderzy mogą aktualizować is_independent podliderów w swojej strukturze
-- (będzie weryfikowane w kodzie aplikacji)
