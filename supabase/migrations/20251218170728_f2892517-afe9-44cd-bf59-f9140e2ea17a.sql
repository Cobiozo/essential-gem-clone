-- Create cms_item_translations table for persisting CMS content translations
CREATE TABLE cms_item_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES cms_items(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES i18n_languages(code) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  cells JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, language_code)
);

-- Enable RLS
ALTER TABLE cms_item_translations ENABLE ROW LEVEL SECURITY;

-- Admins can manage CMS translations
CREATE POLICY "Admins can manage CMS translations" ON cms_item_translations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Everyone can view CMS translations
CREATE POLICY "Everyone can view CMS translations" ON cms_item_translations
  FOR SELECT USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_cms_item_translations_updated_at
  BEFORE UPDATE ON cms_item_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();