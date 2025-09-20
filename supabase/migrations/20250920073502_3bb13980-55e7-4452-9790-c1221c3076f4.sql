-- Add formatting columns to cms_items table
ALTER TABLE cms_items 
ADD COLUMN text_formatting JSONB DEFAULT NULL,
ADD COLUMN title_formatting JSONB DEFAULT NULL;