-- Add EQ ID field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN eq_id TEXT;

-- Update profiles table to store role selection during registration
-- Note: role column already exists, just ensuring it accepts the new values
-- The role column should accept: 'client', 'partner', 'admin', 'specialist'

-- Create a trigger function to update profile when user signs up with additional data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, eq_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    NEW.raw_user_meta_data ->> 'eq_id',
    true
  );
  RETURN NEW;
END;
$$;