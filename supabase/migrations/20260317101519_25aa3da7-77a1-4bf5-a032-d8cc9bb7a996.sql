-- Reset reminder flags for test guests
UPDATE guest_event_registrations 
SET reminder_sent = false, reminder_12h_sent = false, reminder_2h_sent = false, 
    reminder_1h_sent = false, reminder_15min_sent = false, thank_you_sent = false,
    reminder_sent_at = null, reminder_12h_sent_at = null, reminder_2h_sent_at = null,
    reminder_1h_sent_at = null, reminder_15min_sent_at = null, thank_you_sent_at = null
WHERE event_id = '58aac028-c68f-45c8-9999-d34b5ebb9ced'
AND email IN ('sebastiansnopek87@gmail.com', 'byk1023@wp.pl');

-- Reset for registered users (event_registrations - no reminder_sent_at column)
UPDATE event_registrations
SET reminder_sent = false, reminder_12h_sent = false, reminder_2h_sent = false,
    reminder_1h_sent = false, reminder_15min_sent = false, thank_you_sent = false,
    reminder_12h_sent_at = null, reminder_2h_sent_at = null,
    reminder_1h_sent_at = null, reminder_15min_sent_at = null, thank_you_sent_at = null
WHERE event_id = '58aac028-c68f-45c8-9999-d34b5ebb9ced';