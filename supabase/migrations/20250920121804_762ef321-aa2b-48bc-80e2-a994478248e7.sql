-- Fix role constraint to allow 'partner' and 'client' and enforce lowercase
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_role_values;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_role_check;

-- Normalize existing data to lowercase to satisfy the new constraint
UPDATE public.profiles SET role = lower(role);

-- Recreate a single consistent constraint
ALTER TABLE public.profiles
ADD CONSTRAINT valid_role_values CHECK (lower(role) IN ('user','client','admin','partner'));

-- Ensure default aligns with UI terminology (client)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'client';