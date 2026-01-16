-- Enable REPLICA IDENTITY FULL for complete row data on real-time changes
ALTER TABLE infolink_otp_codes REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE infolink_otp_codes;