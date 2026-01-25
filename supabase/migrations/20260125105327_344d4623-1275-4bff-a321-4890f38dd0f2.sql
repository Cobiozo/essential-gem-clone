-- Dodanie pól do tabeli profiles dla samouczka onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_skipped boolean DEFAULT false;