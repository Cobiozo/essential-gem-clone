
DROP FUNCTION IF EXISTS public.get_organization_tree(text, integer);

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
  level INT,
  is_active BOOLEAN
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
      0 as level,
      p.is_active
    FROM profiles p
    WHERE p.eq_id = p_root_eq_id AND p.is_active = true
    
    UNION ALL
    
    SELECT 
      p.user_id, p.first_name, p.last_name,
      p.eq_id, p.upline_eq_id, p.role, p.avatar_url,
      p.email, p.phone_number,
      t.level + 1,
      p.is_active
    FROM profiles p
    INNER JOIN tree t ON p.upline_eq_id = t.eq_id
    WHERE t.level < p_max_depth
  )
  SELECT tree.id, tree.first_name, tree.last_name, tree.eq_id, 
         tree.upline_eq_id, tree.role, tree.avatar_url,
         tree.email, tree.phone_number, tree.level, tree.is_active
  FROM tree 
  ORDER BY tree.level, tree.role, tree.first_name;
END;
$$;
