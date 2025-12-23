-- =============================================
-- Role Chat System with Hierarchy
-- =============================================

-- Function to get role hierarchy level
CREATE OR REPLACE FUNCTION public.get_role_level(role_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE role_name
    WHEN 'admin' THEN 100
    WHEN 'partner' THEN 75
    WHEN 'specjalista' THEN 50
    WHEN 'client' THEN 25
    ELSE 0
  END;
END;
$$;

-- Function to check if sender can message target role
CREATE OR REPLACE FUNCTION public.can_send_to_role(sender_role TEXT, target_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_role_level(sender_role) >= get_role_level(target_role);
END;
$$;

-- Function to get current user's role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role_name(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- =============================================
-- Role Chat Channels Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.role_chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type TEXT NOT NULL DEFAULT 'role_to_role', -- 'role_to_role', 'role_broadcast'
  sender_role TEXT NOT NULL,
  target_role TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_role, target_role)
);

ALTER TABLE public.role_chat_channels ENABLE ROW LEVEL SECURITY;

-- Admins can manage channels
CREATE POLICY "Admins can manage chat channels"
ON public.role_chat_channels FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can view active channels they have access to
CREATE POLICY "Users can view accessible channels"
ON public.role_chat_channels FOR SELECT
USING (
  is_active = true AND (
    sender_role = get_user_role_name(auth.uid()) OR
    target_role = get_user_role_name(auth.uid())
  )
);

-- =============================================
-- Role Chat Messages Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.role_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.role_chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  recipient_id UUID, -- NULL = broadcast to all users with that role
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.role_chat_messages ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_role_chat_messages_recipient ON public.role_chat_messages(recipient_role, recipient_id);
CREATE INDEX IF NOT EXISTS idx_role_chat_messages_sender ON public.role_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_role_chat_messages_channel ON public.role_chat_messages(channel_id);

-- Admins can manage all messages
CREATE POLICY "Admins can manage all chat messages"
ON public.role_chat_messages FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can send messages only to lower or equal roles
CREATE POLICY "Send to lower or equal roles"
ON public.role_chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  sender_role = get_user_role_name(auth.uid()) AND
  can_send_to_role(sender_role, recipient_role) = true
);

-- Users can read messages addressed to them or their role
CREATE POLICY "Read own messages"
ON public.role_chat_messages FOR SELECT
USING (
  sender_id = auth.uid() OR
  recipient_id = auth.uid() OR
  (recipient_id IS NULL AND recipient_role = get_user_role_name(auth.uid()))
);

-- Users can update read status of their messages
CREATE POLICY "Update read status of own messages"
ON public.role_chat_messages FOR UPDATE
USING (
  recipient_id = auth.uid() OR
  (recipient_id IS NULL AND recipient_role = get_user_role_name(auth.uid()))
)
WITH CHECK (
  recipient_id = auth.uid() OR
  (recipient_id IS NULL AND recipient_role = get_user_role_name(auth.uid()))
);

-- =============================================
-- Add target_role to user_notifications
-- =============================================
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS target_role TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_target_role 
ON public.user_notifications(target_role);

-- =============================================
-- Default Chat Channels
-- =============================================
INSERT INTO public.role_chat_channels (sender_role, target_role, name, description) VALUES
  ('admin', 'partner', 'Admin → Partner', 'Kanał komunikacji od Administratora do Partnerów'),
  ('admin', 'specjalista', 'Admin → Specjalista', 'Kanał komunikacji od Administratora do Specjalistów'),
  ('admin', 'client', 'Admin → Klient', 'Kanał komunikacji od Administratora do Klientów'),
  ('partner', 'specjalista', 'Partner → Specjalista', 'Kanał komunikacji od Partnera do Specjalistów'),
  ('partner', 'client', 'Partner → Klient', 'Kanał komunikacji od Partnera do Klientów'),
  ('specjalista', 'client', 'Specjalista → Klient', 'Kanał komunikacji od Specjalisty do Klientów')
ON CONFLICT (sender_role, target_role) DO NOTHING;