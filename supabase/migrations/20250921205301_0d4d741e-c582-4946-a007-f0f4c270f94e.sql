-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Update the handle_new_user function to include first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, eq_id, first_name, last_name, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    NEW.raw_user_meta_data ->> 'eq_id',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    true
  );
  RETURN NEW;
END;
$function$;