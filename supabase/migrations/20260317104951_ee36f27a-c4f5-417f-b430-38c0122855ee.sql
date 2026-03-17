-- Reset reminder flags for ALL guests who received premature bulk reminders
-- These guests had their flags set to true by the accidental bulk send
UPDATE guest_event_registrations
SET reminder_sent = false, reminder_12h_sent = false, reminder_2h_sent = false,
    reminder_1h_sent = false, reminder_15min_sent = false,
    reminder_sent_at = null, reminder_12h_sent_at = null, reminder_2h_sent_at = null,
    reminder_1h_sent_at = null, reminder_15min_sent_at = null
WHERE event_id = '58aac028-c68f-45c8-9999-d34b5ebb9ced'
AND (reminder_sent = true OR reminder_12h_sent = true OR reminder_2h_sent = true 
     OR reminder_1h_sent = true OR reminder_15min_sent = true);