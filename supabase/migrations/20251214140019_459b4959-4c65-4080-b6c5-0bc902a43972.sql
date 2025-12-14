-- Add numbering columns to cms_items table
ALTER TABLE public.cms_items 
ADD COLUMN IF NOT EXISTS show_number BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS number_type TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS custom_number TEXT,
ADD COLUMN IF NOT EXISTS custom_number_image TEXT;