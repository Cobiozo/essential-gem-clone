-- Zaktualizuj politykę RLS dla events aby obejmowała nowe typy spotkań
DROP POLICY IF EXISTS "events_leaders_manage_own" ON events;

CREATE POLICY "events_leaders_manage_own"
ON events
FOR ALL
TO authenticated
USING (
  auth.uid() = host_user_id 
  AND event_type IN ('private_meeting', 'tripartite_meeting', 'partner_consultation', 'meeting_private')
)
WITH CHECK (
  auth.uid() = host_user_id 
  AND event_type IN ('private_meeting', 'tripartite_meeting', 'partner_consultation', 'meeting_private')
);