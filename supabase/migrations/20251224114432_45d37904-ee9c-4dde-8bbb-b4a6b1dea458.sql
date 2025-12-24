
-- Update admin profiles with names
UPDATE public.profiles 
SET first_name = 'Admin', last_name = 'System', updated_at = NOW()
WHERE user_id = '629a2d9a-994a-4e6a-a9c4-8ae0b07e3770' AND (first_name IS NULL OR first_name = '');

UPDATE public.profiles 
SET first_name = 'Biuro', last_name = 'Mobilne IT', updated_at = NOW()
WHERE user_id = '818aef5e-cb34-488b-a157-4c330d006f99' AND (first_name IS NULL OR first_name = '');
