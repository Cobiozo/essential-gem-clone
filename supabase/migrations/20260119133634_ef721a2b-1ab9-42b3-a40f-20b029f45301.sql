-- Create chat_permissions table for controlling communication directions
CREATE TABLE public.chat_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_role TEXT NOT NULL,
  target_role TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  allow_individual BOOLEAN DEFAULT true,
  allow_group BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_role, target_role)
);

-- Enable RLS
ALTER TABLE public.chat_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage chat permissions
CREATE POLICY "Admins can manage chat permissions"
ON public.chat_permissions FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Everyone can read enabled permissions (to check if they can message)
CREATE POLICY "Everyone can view enabled permissions"
ON public.chat_permissions FOR SELECT
USING (true);

-- Insert default permission directions (admin can message everyone, partner can message down, etc.)
INSERT INTO public.chat_permissions (sender_role, target_role, is_enabled, description) VALUES
  ('admin', 'partner', true, 'Administrator może pisać do Partnerów'),
  ('admin', 'specjalista', true, 'Administrator może pisać do Specjalistów'),
  ('admin', 'client', true, 'Administrator może pisać do Klientów'),
  ('partner', 'specjalista', true, 'Partner może pisać do Specjalistów'),
  ('partner', 'client', true, 'Partner może pisać do Klientów'),
  ('partner', 'partner', false, 'Partner może pisać do innych Partnerów'),
  ('specjalista', 'client', true, 'Specjalista może pisać do Klientów'),
  ('specjalista', 'specjalista', false, 'Specjalista może pisać do innych Specjalistów'),
  ('client', 'partner', false, 'Klient może pisać do Partnerów'),
  ('client', 'specjalista', false, 'Klient może pisać do Specjalistów');

-- Create helper function to check if a user can initiate chat with another role
CREATE OR REPLACE FUNCTION public.can_initiate_chat(sender_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_user_role TEXT;
  target_user_role TEXT;
  permission_exists BOOLEAN;
BEGIN
  -- Get sender's role
  SELECT role INTO sender_user_role
  FROM user_roles
  WHERE user_id = sender_user_id;
  
  -- Get target's role
  SELECT role INTO target_user_role
  FROM user_roles
  WHERE user_id = target_user_id;
  
  -- Admin can always initiate
  IF sender_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if permission exists and is enabled
  SELECT EXISTS (
    SELECT 1 FROM chat_permissions
    WHERE sender_role = sender_user_role
    AND target_role = target_user_role
    AND is_enabled = true
  ) INTO permission_exists;
  
  RETURN permission_exists;
END;
$$;

-- Create helper function to get user's role (for frontend queries)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(user_role, 'client');
END;
$$;

-- Update private_chat_threads RLS to allow non-admins to create threads (based on permissions)
DROP POLICY IF EXISTS "Only admins can create threads" ON public.private_chat_threads;

CREATE POLICY "Users can create threads based on permissions"
ON public.private_chat_threads FOR INSERT
WITH CHECK (
  initiator_id = auth.uid() AND (
    is_admin() OR
    (NOT is_group AND can_initiate_chat(auth.uid(), participant_id)) OR
    is_group
  )
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_chat_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_permissions_updated_at
BEFORE UPDATE ON public.chat_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_permissions_updated_at();