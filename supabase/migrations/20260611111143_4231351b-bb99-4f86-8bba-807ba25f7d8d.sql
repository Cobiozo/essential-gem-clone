
ALTER TABLE public.guest_event_registrations
  ADD COLUMN IF NOT EXISTS inviter_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS inviter_snapshot jsonb;

ALTER TABLE public.event_form_submissions
  ADD COLUMN IF NOT EXISTS partner_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_snapshot jsonb;

ALTER TABLE public.paid_event_partner_links
  ADD COLUMN IF NOT EXISTS partner_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_snapshot jsonb;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS creator_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_snapshot jsonb;

ALTER TABLE public.account_deletion_log
  ADD COLUMN IF NOT EXISTS user_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_email_status text,
  ADD COLUMN IF NOT EXISTS user_email_error text;

CREATE INDEX IF NOT EXISTS idx_ger_inviter_deleted_at ON public.guest_event_registrations(inviter_deleted_at) WHERE inviter_deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_efs_partner_deleted_at ON public.event_form_submissions(partner_deleted_at) WHERE partner_deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pepl_partner_deleted_at ON public.paid_event_partner_links(partner_deleted_at) WHERE partner_deleted_at IS NOT NULL;
