-- Dodaj kolumnę video_duration_seconds do training_lessons
ALTER TABLE training_lessons 
ADD COLUMN IF NOT EXISTS video_duration_seconds integer DEFAULT 0;

COMMENT ON COLUMN training_lessons.video_duration_seconds IS 
  'Rzeczywisty czas trwania wideo w sekundach, uzupełniany automatycznie przy uploaderze';