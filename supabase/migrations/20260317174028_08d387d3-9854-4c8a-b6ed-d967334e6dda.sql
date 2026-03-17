-- Mark all registrations for "Prezentacja możliwości biznesowych" as reminder sent
-- to stop the duplicate email loop
UPDATE public.event_registrations 
SET reminder_sent = true, reminder_sent_at = NOW() 
WHERE event_id = '58aac028-c68f-45c8-9999-d34b5ebb9ced' 
AND reminder_sent = false;