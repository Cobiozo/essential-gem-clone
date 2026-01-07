-- Fix role for enterpiaseczno@wp.pl - set to partner
-- Only update profiles table (user_roles requires valid auth.users FK)

-- Disable role protection triggers on profiles
ALTER TABLE profiles DISABLE TRIGGER prevent_role_escalation_trigger;
ALTER TABLE profiles DISABLE TRIGGER validate_role_change_trigger;

-- Update profiles table
UPDATE profiles 
SET role = 'partner' 
WHERE email = 'enterpiaseczno@wp.pl';

-- Re-enable triggers
ALTER TABLE profiles ENABLE TRIGGER prevent_role_escalation_trigger;
ALTER TABLE profiles ENABLE TRIGGER validate_role_change_trigger;