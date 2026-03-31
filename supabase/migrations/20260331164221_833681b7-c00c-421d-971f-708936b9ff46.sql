-- Table for per-user conversation settings (delete, archive, block)
CREATE TABLE public.conversation_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  is_archived boolean DEFAULT false,
  archived_at timestamptz,
  is_blocked boolean DEFAULT false,
  blocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, other_user_id)
);

ALTER TABLE public.conversation_user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read/manage their own settings
CREATE POLICY "Users can read own settings"
  ON public.conversation_user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON public.conversation_user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON public.conversation_user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_conversation_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_user_settings_updated_at
  BEFORE UPDATE ON public.conversation_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_user_settings_updated_at();

-- Function to check if user is blocked by another user (for message filtering)
CREATE OR REPLACE FUNCTION public.is_blocked_by(p_blocker_id uuid, p_blocked_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_user_settings
    WHERE user_id = p_blocker_id
      AND other_user_id = p_blocked_id
      AND is_blocked = true
  );
$$;