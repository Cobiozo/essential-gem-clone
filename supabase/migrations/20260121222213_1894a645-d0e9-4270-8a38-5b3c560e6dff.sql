-- Create html_pages table for standalone HTML pages
CREATE TABLE public.html_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  html_content TEXT NOT NULL DEFAULT '',
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visible_to_everyone BOOLEAN NOT NULL DEFAULT false,
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_partners BOOLEAN NOT NULL DEFAULT false,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT false,
  visible_to_anonymous BOOLEAN NOT NULL DEFAULT false,
  show_header BOOLEAN NOT NULL DEFAULT true,
  show_footer BOOLEAN NOT NULL DEFAULT false,
  show_in_sidebar BOOLEAN NOT NULL DEFAULT false,
  sidebar_icon TEXT DEFAULT 'FileText',
  sidebar_position INTEGER DEFAULT 99,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.html_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view published pages marked as visible_to_everyone or visible_to_anonymous
CREATE POLICY "Public pages are viewable by everyone"
ON public.html_pages
FOR SELECT
USING (
  is_active = true 
  AND is_published = true 
  AND (visible_to_everyone = true OR visible_to_anonymous = true)
);

-- Policy: Logged in users can view pages based on their role
CREATE POLICY "Role-based page access"
ON public.html_pages
FOR SELECT
USING (
  is_active = true 
  AND is_published = true 
  AND auth.uid() IS NOT NULL
  AND (
    visible_to_everyone = true
    OR (visible_to_clients = true AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('client', 'user')
    ))
    OR (visible_to_partners = true AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'partner'
    ))
    OR (visible_to_specjalista = true AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'specjalista'
    ))
    OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to html_pages"
ON public.html_pages
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_html_pages_updated_at
BEFORE UPDATE ON public.html_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for slug lookups
CREATE INDEX idx_html_pages_slug ON public.html_pages(slug);
CREATE INDEX idx_html_pages_sidebar ON public.html_pages(show_in_sidebar, sidebar_position) WHERE is_active = true AND is_published = true;