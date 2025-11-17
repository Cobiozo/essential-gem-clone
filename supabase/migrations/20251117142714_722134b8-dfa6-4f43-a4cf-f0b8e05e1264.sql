-- Add roles column to certificate_templates table
ALTER TABLE certificate_templates 
ADD COLUMN roles app_role[] DEFAULT ARRAY[]::app_role[];

-- Set all roles for existing active templates
UPDATE certificate_templates 
SET roles = ARRAY['admin', 'partner', 'client', 'specjalista', 'user']::app_role[]
WHERE is_active = true;

-- Add GIN index for better performance when searching by roles
CREATE INDEX idx_certificate_templates_roles ON certificate_templates USING GIN (roles);

-- Add comment for documentation
COMMENT ON COLUMN certificate_templates.roles IS 'User roles that will use this certificate template as default';