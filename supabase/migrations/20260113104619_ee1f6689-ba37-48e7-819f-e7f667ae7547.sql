-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "events_select_for_users" ON public.events;
DROP POLICY IF EXISTS "hosts_view_event_registrations" ON public.event_registrations;

-- Create SECURITY DEFINER function to get user's registered event IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_registered_event_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT event_id FROM public.event_registrations 
  WHERE user_id = auth.uid()
$$;

-- Create SECURITY DEFINER function to get event host user id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_event_host_user_id(p_event_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT host_user_id FROM public.events WHERE id = p_event_id LIMIT 1
$$;

-- Create new policy for events using the security definer function
CREATE POLICY "events_select_for_users" ON public.events
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND (
      visible_to_everyone = true 
      OR auth.uid() = created_by 
      OR auth.uid() = host_user_id 
      OR id = ANY(ARRAY(SELECT public.user_registered_event_ids()))
    )
  );

-- Create new policy for event_registrations using the security definer function
CREATE POLICY "hosts_view_event_registrations" ON public.event_registrations
  FOR SELECT
  TO authenticated
  USING (
    public.get_event_host_user_id(event_id) = auth.uid()
  );