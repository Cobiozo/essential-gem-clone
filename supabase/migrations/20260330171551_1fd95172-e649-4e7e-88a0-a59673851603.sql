-- Add status column
ALTER TABLE public.testimonial_comments ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Drop old policy
DROP POLICY IF EXISTS "Anyone can read comments" ON testimonial_comments;

-- Users see approved + own; admins see all
CREATE POLICY "Read approved or own" ON testimonial_comments
  FOR SELECT TO authenticated
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admin can update status
DROP POLICY IF EXISTS "Users can update own" ON testimonial_comments;
CREATE POLICY "Admins can update status" ON testimonial_comments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC function to fetch comments with profile data
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
    tc.id, tc.knowledge_id, tc.user_id, tc.rating, tc.comment, tc.status, tc.created_at,
    p.first_name, p.last_name, p.avatar_url
  FROM public.testimonial_comments tc
  LEFT JOIN public.profiles p ON p.user_id = tc.user_id
  WHERE tc.knowledge_id = p_knowledge_id
  AND (tc.status = 'approved' OR tc.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ORDER BY tc.created_at DESC;
$$;

-- Admin function to get ALL pending comments
CREATE OR REPLACE FUNCTION public.get_pending_testimonial_comments()
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT 
    tc.id, tc.knowledge_id, tc.user_id, tc.rating, tc.comment, tc.status, tc.created_at,
    p.first_name, p.last_name, p.avatar_url,
    hk.title AS knowledge_title
  FROM public.testimonial_comments tc
  LEFT JOIN public.profiles p ON p.user_id = tc.user_id
  LEFT JOIN public.healthy_knowledge hk ON hk.id = tc.knowledge_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY 
    CASE WHEN tc.status = 'pending' THEN 0 ELSE 1 END,
    tc.created_at DESC;
$$;