-- Add job_type column to translation_jobs to support both i18n and CMS translations
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'i18n';

-- Add page_id for CMS jobs to track which page is being translated
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS page_id UUID;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_job_type ON translation_jobs(job_type);