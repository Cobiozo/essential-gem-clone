-- Add tutorial_shown_once column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_shown_once boolean DEFAULT false;