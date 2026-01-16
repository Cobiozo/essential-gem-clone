-- Allow authenticated users to view leaders with enabled meeting permissions
-- This enables partners and clients to see available leaders for booking meetings

CREATE POLICY "authenticated_view_enabled_leaders" 
ON public.leader_permissions
FOR SELECT 
TO authenticated
USING (
  individual_meetings_enabled = true 
  OR tripartite_meeting_enabled = true 
  OR partner_consultation_enabled = true
);