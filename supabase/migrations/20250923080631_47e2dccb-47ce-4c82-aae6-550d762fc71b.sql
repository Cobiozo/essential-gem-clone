-- Add column_index to cms_items to persist column assignment
ALTER TABLE public.cms_items
ADD COLUMN IF NOT EXISTS column_index integer NOT NULL DEFAULT 0;

-- Optional index for queries by section and column
CREATE INDEX IF NOT EXISTS idx_cms_items_section_column ON public.cms_items (section_id, column_index, position);
