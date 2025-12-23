-- Add email integration columns to notification_event_types
ALTER TABLE notification_event_types 
ADD COLUMN IF NOT EXISTS email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL;

ALTER TABLE notification_event_types 
ADD COLUMN IF NOT EXISTS send_email boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN notification_event_types.email_template_id IS 'Reference to email template to use when sending email for this event';
COMMENT ON COLUMN notification_event_types.send_email IS 'Whether to send email notification for this event type';