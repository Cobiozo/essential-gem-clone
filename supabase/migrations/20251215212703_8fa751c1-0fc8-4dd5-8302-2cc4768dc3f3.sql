-- Add phone_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number text;

-- Update handle_new_user function to include phone_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert into profiles (without role)
  INSERT INTO public.profiles (user_id, email, eq_id, first_name, last_name, phone_number, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'eq_id',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone_number',
    true
  );
  
  -- Determine role
  BEGIN
    user_role := COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::app_role,
      'client'::app_role
    );
  EXCEPTION WHEN OTHERS THEN
    user_role := 'client'::app_role;
  END;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;