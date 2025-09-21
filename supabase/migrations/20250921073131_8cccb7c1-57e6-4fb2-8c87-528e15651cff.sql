-- Add missing customization columns so all section options can be saved
ALTER TABLE public.cms_sections
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS font_size integer,
  ADD COLUMN IF NOT EXISTS alignment text,
  ADD COLUMN IF NOT EXISTS padding integer,
  ADD COLUMN IF NOT EXISTS margin integer,
  ADD COLUMN IF NOT EXISTS border_radius integer,
  ADD COLUMN IF NOT EXISTS style_class text;

-- Optional: update updated_at automatically on updates (only if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_cms_sections_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_cms_sections_updated_at
    BEFORE UPDATE ON public.cms_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;