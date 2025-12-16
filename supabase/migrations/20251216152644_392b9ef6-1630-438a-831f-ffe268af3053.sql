-- Add action control columns to knowledge_resources table
ALTER TABLE public.knowledge_resources
ADD COLUMN IF NOT EXISTS allow_copy_link boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_share boolean NOT NULL DEFAULT false;