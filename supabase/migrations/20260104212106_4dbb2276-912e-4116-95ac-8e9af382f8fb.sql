-- Add action_buttons column to training_lessons
ALTER TABLE training_lessons 
ADD COLUMN IF NOT EXISTS action_buttons JSONB DEFAULT '[]'::jsonb;

-- Add resource_ids column to training_modules for linking resources
ALTER TABLE training_modules 
ADD COLUMN IF NOT EXISTS resource_ids UUID[] DEFAULT '{}';

-- Add tags column to knowledge_resources if not exists for better grouping
ALTER TABLE knowledge_resources
ADD COLUMN IF NOT EXISTS work_stage TEXT DEFAULT NULL;

-- Create index for faster tag/category queries
CREATE INDEX IF NOT EXISTS idx_knowledge_resources_category ON knowledge_resources(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_resources_tags ON knowledge_resources USING GIN(tags);

-- Comment on columns
COMMENT ON COLUMN training_lessons.action_buttons IS 'JSON array of action buttons: [{id, label, type, url, resource_id, file_url, file_name, icon, open_in_new_tab}]';
COMMENT ON COLUMN training_modules.resource_ids IS 'Array of knowledge_resources IDs linked to this module';