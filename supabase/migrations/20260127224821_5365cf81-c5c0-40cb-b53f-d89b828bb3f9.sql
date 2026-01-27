-- Add external platform fields to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_external_platform boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS external_platform_message text;

-- Add helpful comment
COMMENT ON COLUMN public.events.is_external_platform IS 'When true, indicates the event takes place on an external platform (e.g., Zoom, EQ App) and not within PureLife';
COMMENT ON COLUMN public.events.external_platform_message IS 'Custom message shown to users explaining external platform registration process';