-- Find and drop existing check constraint that blocks partner role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_role_check;

-- Add new check constraint that includes partner role
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role_check 
CHECK (role IN ('user', 'client', 'admin', 'partner'));

-- Also ensure the default is set correctly
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'user';