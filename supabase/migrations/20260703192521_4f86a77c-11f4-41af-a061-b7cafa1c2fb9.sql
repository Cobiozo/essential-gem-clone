CREATE OR REPLACE FUNCTION public.increment_hk_view(_material_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.healthy_knowledge
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE id = _material_id
     AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_hk_view(uuid) TO authenticated, anon;