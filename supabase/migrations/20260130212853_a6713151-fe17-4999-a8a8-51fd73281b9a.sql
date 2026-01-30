-- Create chat_sidebar_visibility table (singleton pattern)
CREATE TABLE public.chat_sidebar_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visible_to_admin boolean NOT NULL DEFAULT true,
  visible_to_partner boolean NOT NULL DEFAULT true,
  visible_to_specjalista boolean NOT NULL DEFAULT true,
  visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default row with all visibility enabled
INSERT INTO public.chat_sidebar_visibility (id) VALUES (gen_random_uuid());

-- Enable RLS
ALTER TABLE public.chat_sidebar_visibility ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Authenticated users can read chat visibility" 
ON public.chat_sidebar_visibility
FOR SELECT TO authenticated 
USING (true);

-- Only admins can update
CREATE POLICY "Only admins can update chat visibility" 
ON public.chat_sidebar_visibility
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_chat_sidebar_visibility_updated_at
BEFORE UPDATE ON public.chat_sidebar_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();