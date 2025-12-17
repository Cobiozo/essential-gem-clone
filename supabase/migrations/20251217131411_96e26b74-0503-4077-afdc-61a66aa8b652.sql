-- Add scheduled_date and image_url columns to important_info_banners
ALTER TABLE public.important_info_banners 
ADD COLUMN scheduled_date timestamp with time zone DEFAULT NULL,
ADD COLUMN image_url text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.important_info_banners.scheduled_date IS 'Date when banner should start being displayed. NULL means immediately active.';
COMMENT ON COLUMN public.important_info_banners.image_url IS 'Optional image URL to display in the banner.';