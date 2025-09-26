-- Create separate table for system texts (header, author, etc.)
CREATE TABLE public.system_texts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('header_text', 'author')),
  content TEXT,
  text_formatting JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_texts ENABLE ROW LEVEL SECURITY;

-- Create policies for system texts
CREATE POLICY "Everyone can view active system texts" 
ON public.system_texts 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage system texts" 
ON public.system_texts 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_texts_updated_at
BEFORE UPDATE ON public.system_texts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing header_text and author items from cms_items to system_texts
INSERT INTO public.system_texts (type, content, text_formatting, is_active, created_at, updated_at)
SELECT 
  type,
  description as content,
  text_formatting,
  is_active,
  created_at,
  updated_at
FROM public.cms_items 
WHERE type IN ('header_text', 'author') 
  AND is_active = true
ON CONFLICT DO NOTHING;

-- Clean up old header_text and author items from cms_items
UPDATE public.cms_items 
SET is_active = false 
WHERE type IN ('header_text', 'author');