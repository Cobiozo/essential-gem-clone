
-- Funkcja SECURITY DEFINER sprawdzająca aktywną konwersację admin
CREATE OR REPLACE FUNCTION public.has_active_admin_conversation(
  _user_a uuid, _user_b uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_conversations
    WHERE status = 'open'
    AND (
      (admin_user_id = _user_a AND target_user_id = _user_b)
      OR (admin_user_id = _user_b AND target_user_id = _user_a)
    )
  );
$$;

-- Zaktualizowana polityka INSERT
DROP POLICY IF EXISTS "Send to lower or equal roles" ON role_chat_messages;
CREATE POLICY "Send to lower or equal roles" ON role_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = get_user_role_name(auth.uid())
  AND (
    can_send_to_role(sender_role, recipient_role) = true
    OR (
      recipient_id IS NOT NULL
      AND has_active_admin_conversation(auth.uid(), recipient_id)
    )
  )
);
