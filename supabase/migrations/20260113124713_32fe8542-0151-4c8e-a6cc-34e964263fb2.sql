-- Drop existing policy that doesn't check role-based visibility
DROP POLICY IF EXISTS events_select_for_users ON events;

-- Create improved policy that properly checks visibility per user role
CREATE POLICY events_select_for_users ON events
FOR SELECT
USING (
  is_active = true 
  AND (
    -- Everyone can see if visible_to_everyone
    visible_to_everyone = true
    -- Creator can always see their events
    OR auth.uid() = created_by
    -- Host can see their events
    OR auth.uid() = host_user_id
    -- User is registered for this event
    OR id = ANY(ARRAY(SELECT user_registered_event_ids()))
    -- Check role-based visibility using has_role function
    OR (
      visible_to_clients = true 
      AND public.has_role(auth.uid(), 'client')
    )
    OR (
      visible_to_partners = true 
      AND public.has_role(auth.uid(), 'partner')
    )
    OR (
      visible_to_specjalista = true 
      AND public.has_role(auth.uid(), 'specjalista')
    )
  )
);