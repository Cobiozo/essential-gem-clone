-- Make role checks case-insensitive and normalize existing data

-- 1) Return lowercase role (or 'anonymous')
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r TEXT;
BEGIN
  SELECT lower(role) INTO r FROM public.profiles WHERE user_id = auth.uid();
  RETURN COALESCE(r, 'anonymous');
END;
$function$;

-- 2) Make is_admin case-insensitive
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(role) = 'admin'
  );
$function$;

-- 3) Normalize existing roles to lowercase (safe no-op if already lowercase)
UPDATE public.profiles
   SET role = lower(role)
 WHERE role IS NOT NULL;