-- Tabela ustawień struktury organizacji
CREATE TABLE public.organization_tree_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  max_depth INTEGER NOT NULL DEFAULT 10,
  default_view TEXT NOT NULL DEFAULT 'list',
  
  -- Widoczność funkcji per rola
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_partners BOOLEAN NOT NULL DEFAULT true,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT true,
  
  -- Widoczność danych w węzłach
  show_eq_id BOOLEAN NOT NULL DEFAULT false,
  show_email BOOLEAN NOT NULL DEFAULT false,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_role_badge BOOLEAN NOT NULL DEFAULT true,
  show_avatar BOOLEAN NOT NULL DEFAULT true,
  show_upline BOOLEAN NOT NULL DEFAULT true,
  show_statistics BOOLEAN NOT NULL DEFAULT true,
  
  -- Ustawienia grafu
  graph_node_size TEXT NOT NULL DEFAULT 'medium',
  graph_show_lines BOOLEAN NOT NULL DEFAULT true,
  graph_expandable BOOLEAN NOT NULL DEFAULT true,
  
  -- Limity głębokości per rola
  client_max_depth INTEGER NOT NULL DEFAULT 0,
  partner_max_depth INTEGER NOT NULL DEFAULT 10,
  specjalista_max_depth INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.organization_tree_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage organization tree settings"
ON public.organization_tree_settings FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Everyone can view organization tree settings"
ON public.organization_tree_settings FOR SELECT USING (true);

-- Trigger updated_at
CREATE TRIGGER update_organization_tree_settings_updated_at
BEFORE UPDATE ON public.organization_tree_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Domyślne ustawienia
INSERT INTO public.organization_tree_settings (id) 
VALUES (gen_random_uuid());

-- Funkcja pobierania struktury organizacji
CREATE OR REPLACE FUNCTION public.get_organization_tree(
  p_root_eq_id TEXT,
  p_max_depth INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  eq_id TEXT,
  upline_eq_id TEXT,
  role TEXT,
  avatar_url TEXT,
  email TEXT,
  phone_number TEXT,
  level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT 
      p.user_id as id, p.first_name, p.last_name, 
      p.eq_id, p.upline_eq_id, p.role, p.avatar_url,
      p.email, p.phone_number,
      0 as level
    FROM profiles p
    WHERE p.eq_id = p_root_eq_id AND p.is_active = true
    
    UNION ALL
    
    SELECT 
      p.user_id, p.first_name, p.last_name,
      p.eq_id, p.upline_eq_id, p.role, p.avatar_url,
      p.email, p.phone_number,
      t.level + 1
    FROM profiles p
    INNER JOIN tree t ON p.upline_eq_id = t.eq_id
    WHERE t.level < p_max_depth AND p.is_active = true
  )
  SELECT tree.id, tree.first_name, tree.last_name, tree.eq_id, 
         tree.upline_eq_id, tree.role, tree.avatar_url,
         tree.email, tree.phone_number, tree.level
  FROM tree 
  ORDER BY tree.level, tree.role, tree.first_name;
END;
$$;