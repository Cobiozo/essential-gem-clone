
CREATE TABLE public.admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  UNIQUE(admin_user_id, target_user_id)
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_admin_conversation_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'status must be open or closed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_admin_conversation_status
  BEFORE INSERT OR UPDATE ON public.admin_conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_conversation_status();

ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON public.admin_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_read_own" ON public.admin_conversations
  FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());
