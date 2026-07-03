
ALTER TABLE public.event_email_campaigns
  ADD COLUMN IF NOT EXISTS test_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_recipient_user_id uuid NULL;

-- Swap unique constraint: allow same user across different campaigns of the same event,
-- but prevent duplicates within a single campaign.
ALTER TABLE public.event_email_recipients
  DROP CONSTRAINT IF EXISTS event_email_recipients_event_id_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_email_recipients_campaign_id_user_id_key'
  ) THEN
    ALTER TABLE public.event_email_recipients
      ADD CONSTRAINT event_email_recipients_campaign_id_user_id_key
      UNIQUE (campaign_id, user_id);
  END IF;
END $$;
