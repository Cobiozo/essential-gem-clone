-- Nowa tabela dla ikon stopki paska bocznego
CREATE TABLE public.sidebar_footer_icons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name TEXT NOT NULL DEFAULT 'ExternalLink',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_color TEXT DEFAULT NULL,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  visible_to_admin BOOLEAN DEFAULT true,
  visible_to_partner BOOLEAN DEFAULT true,
  visible_to_client BOOLEAN DEFAULT true,
  visible_to_specjalista BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.sidebar_footer_icons ENABLE ROW LEVEL SECURITY;

-- Wszyscy zalogowani mogą czytać (dla wyświetlenia w sidebarze)
CREATE POLICY "sidebar_footer_icons_select" 
  ON public.sidebar_footer_icons FOR SELECT 
  TO authenticated 
  USING (true);

-- Tylko admini mogą modyfikować
CREATE POLICY "sidebar_footer_icons_admin_insert" 
  ON public.sidebar_footer_icons FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "sidebar_footer_icons_admin_update" 
  ON public.sidebar_footer_icons FOR UPDATE 
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sidebar_footer_icons_admin_delete" 
  ON public.sidebar_footer_icons FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Migracja istniejących danych (FB i WhatsApp z cms_items)
INSERT INTO public.sidebar_footer_icons (icon_name, title, url, icon_color, position, is_active, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista)
SELECT 
  CASE 
    WHEN url ILIKE '%facebook%' THEN 'Facebook'
    WHEN url ILIKE '%whatsapp%' OR url ILIKE '%wa.me%' THEN 'MessageCircle'
    ELSE 'ExternalLink'
  END as icon_name,
  COALESCE(title, 'Link'),
  url,
  CASE 
    WHEN url ILIKE '%facebook%' THEN '#1877F2'
    WHEN url ILIKE '%whatsapp%' OR url ILIKE '%wa.me%' THEN '#25D366'
    ELSE NULL
  END as icon_color,
  ROW_NUMBER() OVER (ORDER BY position) as position,
  true as is_active,
  COALESCE(visible_to_everyone, true) OR COALESCE(visible_to_clients, false) OR COALESCE(visible_to_partners, false) OR COALESCE(visible_to_specjalista, false),
  COALESCE(visible_to_everyone, true) OR COALESCE(visible_to_partners, false),
  COALESCE(visible_to_everyone, true) OR COALESCE(visible_to_clients, false),
  COALESCE(visible_to_everyone, true) OR COALESCE(visible_to_specjalista, false)
FROM public.cms_items
WHERE type = 'button' 
  AND is_active = true
  AND url IS NOT NULL
  AND (url ILIKE '%facebook%' OR url ILIKE '%whatsapp%' OR url ILIKE '%wa.me%' OR url ILIKE '%chat.whatsapp%')
LIMIT 10;