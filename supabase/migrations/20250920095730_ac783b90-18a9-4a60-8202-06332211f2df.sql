-- Create pages table for CMS page management
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Create policies for pages
CREATE POLICY "Anyone can view published pages" 
ON public.pages 
FOR SELECT 
USING (is_published = true AND is_active = true);

CREATE POLICY "Only admins can manage pages" 
ON public.pages 
FOR ALL 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for slug lookup
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_published ON public.pages(is_published, is_active);