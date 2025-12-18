-- Add expiration_date column to important_info_banners
ALTER TABLE public.important_info_banners 
ADD COLUMN expiration_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;