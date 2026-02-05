-- Add attachment columns to role_chat_messages
ALTER TABLE public.role_chat_messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;

-- Add constraint for message_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_chat_messages_message_type_check'
  ) THEN
    ALTER TABLE public.role_chat_messages 
    ADD CONSTRAINT role_chat_messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file'));
  END IF;
END $$;

-- Create chat_user_visibility table for per-user visibility overrides
CREATE TABLE IF NOT EXISTS public.chat_user_visibility (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_user_visibility ENABLE ROW LEVEL SECURITY;

-- Admin can manage all visibility overrides
CREATE POLICY "Admins can manage chat_user_visibility"
ON public.chat_user_visibility FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

-- Users can read their own visibility setting
CREATE POLICY "Users can read own visibility"
ON public.chat_user_visibility FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_user_visibility_user_id ON public.chat_user_visibility(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_chat_user_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chat_user_visibility_updated_at ON public.chat_user_visibility;
CREATE TRIGGER update_chat_user_visibility_updated_at
BEFORE UPDATE ON public.chat_user_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_user_visibility_updated_at();