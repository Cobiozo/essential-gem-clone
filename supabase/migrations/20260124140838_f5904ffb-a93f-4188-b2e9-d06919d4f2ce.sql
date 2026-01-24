-- Add first_used_at column to infolink_otp_codes for timer calculation from first use
ALTER TABLE infolink_otp_codes 
ADD COLUMN first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update existing used codes to have first_used_at = created_at (for backwards compatibility)
UPDATE infolink_otp_codes 
SET first_used_at = created_at 
WHERE used_sessions > 0 AND first_used_at IS NULL;