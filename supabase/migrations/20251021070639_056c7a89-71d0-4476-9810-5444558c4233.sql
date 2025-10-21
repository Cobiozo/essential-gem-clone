-- Add style columns to cms_items table
ALTER TABLE cms_items
ADD COLUMN IF NOT EXISTS text_color text,
ADD COLUMN IF NOT EXISTS background_color text,
ADD COLUMN IF NOT EXISTS font_size integer,
ADD COLUMN IF NOT EXISTS font_weight integer DEFAULT 400,
ADD COLUMN IF NOT EXISTS padding integer,
ADD COLUMN IF NOT EXISTS margin_top integer,
ADD COLUMN IF NOT EXISTS margin_bottom integer,
ADD COLUMN IF NOT EXISTS border_radius integer,
ADD COLUMN IF NOT EXISTS opacity integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS style_class text,
ADD COLUMN IF NOT EXISTS icon_position text DEFAULT 'before',
ADD COLUMN IF NOT EXISTS icon_size integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS icon_color text,
ADD COLUMN IF NOT EXISTS icon_spacing integer DEFAULT 8;

-- Enable realtime for cms_items table
ALTER TABLE cms_items REPLICA IDENTITY FULL;

-- Add cms_items to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'cms_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cms_items;
  END IF;
END $$;

-- Add cms_sections to realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'cms_sections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cms_sections;
  END IF;
END $$;