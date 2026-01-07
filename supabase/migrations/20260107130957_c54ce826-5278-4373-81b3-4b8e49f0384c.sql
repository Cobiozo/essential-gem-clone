-- Update admin profile name from "Admin System" to proper name
UPDATE public.profiles 
SET 
  first_name = 'Sebastian',
  last_name = 'Snopek',
  updated_at = now()
WHERE email = 'sebastiansnopek87@gmail.com';