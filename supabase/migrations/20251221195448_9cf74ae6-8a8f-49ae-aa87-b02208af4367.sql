-- Add guardian_name field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS guardian_name text;

-- Add profile_completed flag to track if user has completed mandatory profile data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Update existing profiles to mark them as completed (existing users should not be blocked)
UPDATE public.profiles SET profile_completed = true WHERE profile_completed IS NULL OR profile_completed = false;