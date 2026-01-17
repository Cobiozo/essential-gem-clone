-- Add SELECT policy for admins in user_google_tokens
CREATE POLICY "Admins can view all google tokens" 
ON public.user_google_tokens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Fix SELECT policy in google_calendar_sync_logs (wrong column reference)
DROP POLICY IF EXISTS "Admins can view all sync logs" ON public.google_calendar_sync_logs;

CREATE POLICY "Admins can view all sync logs" 
ON public.google_calendar_sync_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Fix DELETE policy in google_calendar_sync_logs (wrong column reference)
DROP POLICY IF EXISTS "Admins can delete logs" ON public.google_calendar_sync_logs;

CREATE POLICY "Admins can delete logs" 
ON public.google_calendar_sync_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);