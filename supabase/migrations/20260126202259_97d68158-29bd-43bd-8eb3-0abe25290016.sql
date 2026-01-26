-- Add occurrence_index column to track which occurrence was synced
ALTER TABLE event_google_sync 
ADD COLUMN IF NOT EXISTS occurrence_index INTEGER DEFAULT NULL;

-- Drop old unique constraint if exists
ALTER TABLE event_google_sync 
DROP CONSTRAINT IF EXISTS event_google_sync_event_id_user_id_key;

-- Create new unique index including occurrence_index (using COALESCE to handle NULLs)
DROP INDEX IF EXISTS event_google_sync_unique_idx;
CREATE UNIQUE INDEX event_google_sync_unique_idx 
ON event_google_sync (event_id, user_id, COALESCE(occurrence_index, -1));