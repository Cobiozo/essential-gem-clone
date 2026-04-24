CREATE INDEX IF NOT EXISTS idx_event_form_submissions_partner_user
  ON public.event_form_submissions(partner_user_id);