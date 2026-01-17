-- Add external booking columns to leader_permissions
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS external_calendly_url TEXT,
ADD COLUMN IF NOT EXISTS use_external_booking BOOLEAN DEFAULT false;