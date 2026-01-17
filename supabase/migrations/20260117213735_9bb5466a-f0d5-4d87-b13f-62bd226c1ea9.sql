-- Create google_calendar_sync_logs table for monitoring and diagnostics
CREATE TABLE public.google_calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.google_calendar_sync_logs IS 'Logs for Google Calendar synchronization operations';
COMMENT ON COLUMN public.google_calendar_sync_logs.action IS 'Type of action: create, update, delete, test, connect, disconnect';
COMMENT ON COLUMN public.google_calendar_sync_logs.status IS 'Result status: success, error, skipped';
COMMENT ON COLUMN public.google_calendar_sync_logs.response_time_ms IS 'Time taken for the operation in milliseconds';

-- Create indexes for fast querying
CREATE INDEX idx_gcal_logs_user ON public.google_calendar_sync_logs(user_id);
CREATE INDEX idx_gcal_logs_created ON public.google_calendar_sync_logs(created_at DESC);
CREATE INDEX idx_gcal_logs_status ON public.google_calendar_sync_logs(status);
CREATE INDEX idx_gcal_logs_action ON public.google_calendar_sync_logs(action);

-- Enable Row Level Security
ALTER TABLE public.google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view all sync logs
CREATE POLICY "Admins can view all sync logs" 
ON public.google_calendar_sync_logs 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policy: System can insert logs (via service role in edge functions)
CREATE POLICY "Service role can insert logs" 
ON public.google_calendar_sync_logs 
FOR INSERT 
WITH CHECK (true);

-- Policy: Admins can delete old logs
CREATE POLICY "Admins can delete logs" 
ON public.google_calendar_sync_logs 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);