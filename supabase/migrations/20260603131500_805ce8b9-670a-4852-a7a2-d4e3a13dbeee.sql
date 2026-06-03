CREATE TABLE public.team_contact_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.team_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contact_date DATE,
  channel TEXT,
  subchannel TEXT,
  phone_result TEXT,
  next_contact_date DATE,
  note TEXT,
  sort_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tcc_contact ON public.team_contact_conversations(contact_id, sort_index);
CREATE INDEX idx_tcc_user ON public.team_contact_conversations(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_contact_conversations TO authenticated;
GRANT ALL ON public.team_contact_conversations TO service_role;

ALTER TABLE public.team_contact_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.team_contact_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner_insert" ON public.team_contact_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner_update" ON public.team_contact_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner_delete" ON public.team_contact_conversations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tcc_updated_at
  BEFORE UPDATE ON public.team_contact_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();