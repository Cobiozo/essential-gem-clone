-- Fix RLS policy for user_reflinks INSERT to count only active links
DROP POLICY IF EXISTS "Users can create reflinks if permitted" ON user_reflinks;

CREATE POLICY "Users can create reflinks if permitted"
ON user_reflinks FOR INSERT
TO authenticated
WITH CHECK (
  creator_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM reflink_generation_settings rgs
    JOIN user_roles ur ON ur.role = rgs.role
    WHERE ur.user_id = auth.uid()
      AND rgs.can_generate = true
      AND user_reflinks.target_role = ANY(rgs.allowed_target_roles)
      AND (
        SELECT count(*) 
        FROM user_reflinks 
        WHERE creator_user_id = auth.uid()
          AND is_active = true
      ) < rgs.max_links_per_user
  )
);