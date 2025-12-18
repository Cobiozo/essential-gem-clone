-- Create translation_jobs table for background translation processing
CREATE TABLE public.translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'missing', -- 'all' | 'missing'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_keys INTEGER DEFAULT 0,
  processed_keys INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can manage translation jobs
CREATE POLICY "Admins can manage translation jobs"
ON public.translation_jobs
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_translation_jobs_updated_at
BEFORE UPDATE ON public.translation_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();