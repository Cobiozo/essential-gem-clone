-- Create function to get reflink with creator profile data
-- This bypasses RLS issues with client-side JOINs for unauthenticated users
CREATE OR REPLACE FUNCTION public.get_reflink_with_creator(reflink_code_param text)
RETURNS TABLE(
  id uuid,
  target_role text,
  click_count integer,
  creator_user_id uuid,
  creator_first_name text,
  creator_last_name text,
  creator_eq_id text,
  creator_email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.target_role,
    ur.click_count,
    ur.creator_user_id,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.email
  FROM public.user_reflinks ur
  INNER JOIN public.profiles p ON p.user_id = ur.creator_user_id
  WHERE ur.reflink_code = reflink_code_param
    AND ur.is_active = true
    AND ur.expires_at > now()
  LIMIT 1;
$$;