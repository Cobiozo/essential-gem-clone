-- Fix orphaned contacts that were not properly marked when users were deleted
UPDATE team_contacts tc
SET linked_user_deleted_at = NOW()
WHERE tc.linked_user_id IS NOT NULL
  AND tc.is_active = true
  AND tc.linked_user_deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = tc.linked_user_id
  );