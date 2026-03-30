-- Create a validation trigger for testimonial_comments status
CREATE OR REPLACE FUNCTION public.validate_testimonial_comment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be one of: pending, approved, rejected, suspended', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_testimonial_comment_status ON public.testimonial_comments;
CREATE TRIGGER trg_validate_testimonial_comment_status
  BEFORE INSERT OR UPDATE ON public.testimonial_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_testimonial_comment_status();

-- New RPC: get_all_testimonial_comments (for admin moderation panel)
CREATE OR REPLACE FUNCTION public.get_all_testimonial_comments()
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
  avatar_url text,
  knowledge_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT 
    tc.id, tc.knowledge_id, tc.user_id, tc.rating, tc.comment, tc.status, tc.created_at,
    p.first_name, p.last_name, p.avatar_url,
    hk.title AS knowledge_title
  FROM public.testimonial_comments tc
  LEFT JOIN public.profiles p ON p.user_id = tc.user_id
  LEFT JOIN public.healthy_knowledge hk ON hk.id = tc.knowledge_id
  ORDER BY 
    CASE tc.status
      WHEN 'pending' THEN 0
      WHEN 'suspended' THEN 1
      WHEN 'approved' THEN 2
      WHEN 'rejected' THEN 3
    END,
    tc.created_at DESC;
END;
$$;

-- Ensure public RPC only returns approved + own comments
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
BEGIN
  RETURN QUERY
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
    AND (tc.status = 'approved' OR tc.user_id = auth.uid())
  ORDER BY tc.created_at DESC;
END;
$$;