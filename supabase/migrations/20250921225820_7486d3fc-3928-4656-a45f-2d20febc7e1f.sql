-- Add cells column to cms_items table to support multiple content cells per item
ALTER TABLE public.cms_items 
ADD COLUMN cells JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the cells structure
COMMENT ON COLUMN public.cms_items.cells IS 'Array of content cells with structure: [{id, type, content, url, position, is_active, formatting}]';

-- Create index for better performance when querying cells
CREATE INDEX idx_cms_items_cells ON public.cms_items USING GIN(cells);