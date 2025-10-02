-- Create enum for roles including specjalista
CREATE TYPE public.app_role AS ENUM ('admin', 'partner', 'client', 'specjalista', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 
  CASE 
    WHEN lower(role) = 'admin' THEN 'admin'::app_role
    WHEN lower(role) = 'partner' THEN 'partner'::app_role
    WHEN lower(role) = 'client' THEN 'client'::app_role
    WHEN lower(role) = 'specjalista' THEN 'specjalista'::app_role
    ELSE 'user'::app_role
  END as role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update has_role function to use user_roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Update get_current_user_role to use user_roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'partner' THEN 2
      WHEN 'specjalista' THEN 3
      WHEN 'client' THEN 4
      ELSE 5
    END
  LIMIT 1;
$$;

-- Update is_admin function to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Update admin_update_user_role to use user_roles
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id UUID, target_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role app_role;
BEGIN
  -- Ensure only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can modify user roles';
  END IF;

  -- Validate and cast role
  BEGIN
    new_role := lower(target_role)::app_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid role: %. Must be admin, partner, client, specjalista, or user', target_role;
  END;

  -- Delete existing roles for user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role);

  RETURN TRUE;
END;
$$;

-- Update handle_new_user trigger to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert into profiles (without role)
  INSERT INTO public.profiles (user_id, email, eq_id, first_name, last_name, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'eq_id',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
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

-- Remove role column from profiles (keep for now for reference, but don't use)
-- ALTER TABLE public.profiles DROP COLUMN role;

COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. This column is kept for migration purposes only.';