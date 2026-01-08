-- Add video position tracking to training_progress
ALTER TABLE training_progress 
ADD COLUMN IF NOT EXISTS video_position_seconds NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN training_progress.video_position_seconds IS 
'Pozycja wideo w sekundach - do wznawiania od miejsca przerwania';