
CREATE POLICY "leaders_manage_team_events"
ON public.events
FOR ALL
TO authenticated
USING (
  auth.uid() = host_user_id
  AND event_type IN ('webinar', 'team_training')
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions
    WHERE user_id = auth.uid()
    AND can_create_team_events = true
  )
)
WITH CHECK (
  auth.uid() = host_user_id
  AND event_type IN ('webinar', 'team_training')
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions
    WHERE user_id = auth.uid()
    AND can_create_team_events = true
  )
);
