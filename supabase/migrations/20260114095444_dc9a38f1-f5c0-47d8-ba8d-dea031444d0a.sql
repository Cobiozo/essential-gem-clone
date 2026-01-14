-- Add timezone column to leader_availability table
ALTER TABLE leader_availability 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Warsaw';

-- Add comment for documentation
COMMENT ON COLUMN leader_availability.timezone IS 'IANA timezone identifier for the leader (e.g., Europe/Warsaw, America/New_York)';