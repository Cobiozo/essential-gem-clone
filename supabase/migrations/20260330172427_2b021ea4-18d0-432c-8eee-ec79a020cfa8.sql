CREATE OR REPLACE FUNCTION public.get_testimonial_comments(p_knowledge_id uuid)
RETURNS TABLE(
  id uuid,
  knowledge_id uuid,
  user_id uuid,
  rating integer,
  comment text,
  status text,
  created_at timestamptz,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT 
    tc.id,
    tc.knowledge_id,
    tc.user_id,
    tc.rating,
    tc.comment,
    tc.status,
    tc.created_at,
    p.first_name,
    p.last_name,
    p.avatar_url
  FROM public.testimonial_comments tc
  LEFT JOIN public.profiles p ON p.user_id = tc.user_id
  WHERE tc.knowledge_id = p_knowledge_id
    AND tc.status = 'approved'
  ORDER BY tc.created_at DESC;
$$;