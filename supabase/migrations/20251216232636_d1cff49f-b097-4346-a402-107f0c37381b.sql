-- Add address fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS street_address TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.street_address IS 'User street address with house number';
COMMENT ON COLUMN public.profiles.postal_code IS 'User postal/zip code';
COMMENT ON COLUMN public.profiles.city IS 'User city';
COMMENT ON COLUMN public.profiles.country IS 'User country';