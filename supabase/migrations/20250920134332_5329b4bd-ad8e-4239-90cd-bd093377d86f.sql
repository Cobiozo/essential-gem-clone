-- Add role visibility columns to pages table
ALTER TABLE public.pages 
ADD COLUMN visible_to_partners boolean NOT NULL DEFAULT false,
ADD COLUMN visible_to_clients boolean NOT NULL DEFAULT false,
ADD COLUMN visible_to_everyone boolean NOT NULL DEFAULT true;