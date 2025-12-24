-- Zmiana polityki INSERT na private_chat_threads - tylko admin może tworzyć wątki
DROP POLICY IF EXISTS "Users can create threads" ON private_chat_threads;

CREATE POLICY "Only admins can create threads"
  ON private_chat_threads 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = initiator_id 
    AND is_admin()
  );