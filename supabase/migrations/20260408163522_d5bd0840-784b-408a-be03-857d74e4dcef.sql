
-- Update SELECT policy to handle recipient_role = 'all'
DROP POLICY IF EXISTS "Read own messages" ON role_chat_messages;
CREATE POLICY "Read own messages" ON role_chat_messages
FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR (recipient_id IS NULL AND (
    recipient_role = get_user_role_name(auth.uid())
    OR recipient_role = 'all'
  ))
);

-- Update INSERT policy to allow broadcast with recipient_id = null
DROP POLICY IF EXISTS "Send to lower or equal roles" ON role_chat_messages;
CREATE POLICY "Send to lower or equal roles" ON role_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = get_user_role_name(auth.uid())
  AND (
    can_send_to_role(sender_role, recipient_role) = true
    OR (recipient_id IS NOT NULL AND has_active_admin_conversation(auth.uid(), recipient_id))
  )
);

-- Update UPDATE policy to handle recipient_role = 'all'
DROP POLICY IF EXISTS "Update read status of own messages" ON role_chat_messages;
CREATE POLICY "Update read status of own messages" ON role_chat_messages
FOR UPDATE TO authenticated
USING (
  recipient_id = auth.uid()
  OR (recipient_id IS NULL AND (
    recipient_role = get_user_role_name(auth.uid())
    OR recipient_role = 'all'
  ))
)
WITH CHECK (
  recipient_id = auth.uid()
  OR (recipient_id IS NULL AND (
    recipient_role = get_user_role_name(auth.uid())
    OR recipient_role = 'all'
  ))
);
