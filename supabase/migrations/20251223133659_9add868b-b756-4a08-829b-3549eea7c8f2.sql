-- Set all existing accounts as fully approved
UPDATE public.profiles 
SET 
  guardian_approved = true, 
  admin_approved = true, 
  guardian_approved_at = COALESCE(guardian_approved_at, NOW()), 
  admin_approved_at = COALESCE(admin_approved_at, NOW())
WHERE guardian_approved IS NOT TRUE OR admin_approved IS NOT TRUE;