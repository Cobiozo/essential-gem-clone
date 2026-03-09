-- 1. Drop restrictive CHECK constraint (only allowed '24h','1h')
ALTER TABLE meeting_reminders_sent DROP CONSTRAINT meeting_reminders_sent_reminder_type_check;

-- 2. Add expanded CHECK constraint with all reminder types
ALTER TABLE meeting_reminders_sent ADD CONSTRAINT meeting_reminders_sent_reminder_type_check 
  CHECK (reminder_type = ANY (ARRAY[
    '24h', '12h', '2h', '1h', '15min',
    'prospect_24h', 'prospect_12h', 'prospect_2h', 'prospect_15min'
  ]));

-- 3. Unique index for prospect deduplication (user_id is NULL for prospects)
CREATE UNIQUE INDEX IF NOT EXISTS meeting_reminders_sent_prospect_unique 
  ON meeting_reminders_sent (event_id, prospect_email, reminder_type) 
  WHERE prospect_email IS NOT NULL;