-- Enable REPLICA IDENTITY FULL for complete row data in real-time updates
ALTER TABLE event_registrations REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE event_registrations;