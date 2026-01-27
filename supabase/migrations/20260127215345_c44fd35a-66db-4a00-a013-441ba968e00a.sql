-- Drop the incorrect RLS policy
DROP POLICY IF EXISTS "Admins can manage selected events" ON public.news_ticker_selected_events;

-- Create correct policy using is_admin() function
CREATE POLICY "Admins can manage selected events"
ON public.news_ticker_selected_events
FOR ALL
USING (is_admin());