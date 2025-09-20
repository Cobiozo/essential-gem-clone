-- Function to check if email exists (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.email_exists(email_param text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = email_param
  );
$$;