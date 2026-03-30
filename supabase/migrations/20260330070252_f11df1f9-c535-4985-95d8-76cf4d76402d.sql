-- Fix occurrence_index mismatch for TEAM MEETING
-- Strategy: 
-- 1. For users who already have an index=0 row (cancelled): reactivate it and cancel the index=3 row
-- 2. For users who don't have an index=0 row: update index from 3 to 0

-- Step 1: Reactivate existing index=0 registrations for users who have both
UPDATE event_registrations 
SET status = 'registered'
WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e'
AND occurrence_index = 0
AND status = 'cancelled'
AND user_id IN (
  SELECT user_id FROM event_registrations 
  WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e' 
  AND occurrence_index = 3 AND status = 'registered'
  AND user_id IN (
    SELECT user_id FROM event_registrations 
    WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e' 
    AND occurrence_index = 0
  )
);

-- Step 2: Cancel the duplicate index=3 rows for those same users
UPDATE event_registrations 
SET status = 'cancelled'
WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e'
AND occurrence_index = 3
AND status = 'registered'
AND user_id IN (
  SELECT user_id FROM event_registrations 
  WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e' 
  AND occurrence_index = 0
);

-- Step 3: Update remaining index=3 to index=0 (users without any index=0 row)
UPDATE event_registrations 
SET occurrence_index = 0 
WHERE event_id = 'e3363eaf-7c85-493a-aec0-c1faa276df9e' 
AND status = 'registered' 
AND occurrence_index = 3;