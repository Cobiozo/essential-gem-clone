-- Add rank and avatar_url columns to profiles table for dashboard user card
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;