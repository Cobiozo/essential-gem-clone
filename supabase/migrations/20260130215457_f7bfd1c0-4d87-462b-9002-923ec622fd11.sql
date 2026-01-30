-- Add timezone column to leader_permissions for storing leader's preferred timezone
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Warsaw';

-- Add comment for documentation
COMMENT ON COLUMN leader_permissions.timezone IS 'Leader preferred timezone for individual meetings (e.g., Europe/Warsaw, Europe/London)';