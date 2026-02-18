-- Add unique constraint on (room_id, user_id) for meeting_room_participants to support upsert on rejoin
-- First, clean up any duplicates keeping only the latest
DELETE FROM meeting_room_participants a
USING meeting_room_participants b
WHERE a.room_id = b.room_id
  AND a.user_id = b.user_id
  AND a.joined_at < b.joined_at;

ALTER TABLE meeting_room_participants
  ADD CONSTRAINT meeting_room_participants_room_user_unique UNIQUE (room_id, user_id);