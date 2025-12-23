-- Add editor mode and blocks JSON columns to email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS editor_mode TEXT DEFAULT 'block',
ADD COLUMN IF NOT EXISTS blocks_json JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.email_templates.editor_mode IS 'Editor mode: block or classic';
COMMENT ON COLUMN public.email_templates.blocks_json IS 'Block structure for block editor mode';