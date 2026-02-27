
-- 1. Add created_by column to knowledge_resources
ALTER TABLE public.knowledge_resources ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- 2. Create storage bucket for leader uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-files', 'knowledge-files', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for knowledge-files bucket
CREATE POLICY "Leaders can upload knowledge files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_manage_knowledge_base = true
  )
);

CREATE POLICY "Leaders can update own knowledge files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-files'
  AND owner = auth.uid()
);

CREATE POLICY "Leaders can delete own knowledge files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-files'
  AND owner = auth.uid()
);

CREATE POLICY "Knowledge files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-files');

-- 4. RLS policies for knowledge_resources - leaders can manage their own resources
CREATE POLICY "Leaders can insert own resources"
ON public.knowledge_resources FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_manage_knowledge_base = true
  )
);

CREATE POLICY "Leaders can update own resources"
ON public.knowledge_resources FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_manage_knowledge_base = true
  )
);

CREATE POLICY "Leaders can delete own resources"
ON public.knowledge_resources FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_manage_knowledge_base = true
  )
);

-- 5. RPC to get leader team resources (for downline users viewing their leader's resources)
CREATE OR REPLACE FUNCTION public.get_team_knowledge_resources(p_user_id uuid)
RETURNS TABLE(
  resource_id uuid,
  leader_user_id uuid,
  leader_first_name text,
  leader_last_name text,
  team_custom_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kr.id AS resource_id,
    kr.created_by AS leader_user_id,
    p.first_name AS leader_first_name,
    p.last_name AS leader_last_name,
    pt.custom_name AS team_custom_name
  FROM public.knowledge_resources kr
  INNER JOIN public.profiles p ON p.user_id = kr.created_by
  LEFT JOIN public.platform_teams pt ON pt.leader_user_id = kr.created_by AND pt.is_active = true
  WHERE kr.created_by IS NOT NULL
    AND kr.status = 'active'
    AND kr.created_by IN (SELECT public.get_user_leader_ids(p_user_id))
  ORDER BY kr.created_at DESC;
END;
$$;
