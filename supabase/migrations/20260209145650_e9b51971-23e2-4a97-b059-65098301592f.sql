
ALTER TABLE leader_permissions 
  ADD COLUMN IF NOT EXISTS can_broadcast boolean DEFAULT false;

ALTER TABLE role_chat_messages 
  ADD COLUMN IF NOT EXISTS is_broadcast boolean DEFAULT false;
