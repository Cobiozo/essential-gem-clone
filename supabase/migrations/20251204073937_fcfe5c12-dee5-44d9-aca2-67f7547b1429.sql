-- Add module_ids column to certificate_templates
ALTER TABLE certificate_templates 
ADD COLUMN module_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- Add GIN index for performance
CREATE INDEX idx_certificate_templates_module_ids ON certificate_templates USING GIN (module_ids);

-- Add comment for documentation
COMMENT ON COLUMN certificate_templates.module_ids IS 'IDs of training modules for which this template is used';