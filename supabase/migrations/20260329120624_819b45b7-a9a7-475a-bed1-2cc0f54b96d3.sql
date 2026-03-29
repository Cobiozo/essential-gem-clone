-- Reset ALL active registrations for group events
-- Individual meetings (meeting_private, tripartite_meeting, partner_consultation) are NOT affected
UPDATE event_registrations 
SET status = 'cancelled', cancelled_at = NOW()
WHERE status = 'registered'
  AND event_id IN (
    SELECT id FROM events 
    WHERE event_type IN ('webinar', 'team_training', 'meeting_public', 'auto_webinar')
  );