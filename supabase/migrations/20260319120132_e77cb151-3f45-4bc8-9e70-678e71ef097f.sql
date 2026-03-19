ALTER TABLE public.partner_pages 
ADD COLUMN IF NOT EXISTS template_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS template_history JSONB DEFAULT '{}'::jsonb;