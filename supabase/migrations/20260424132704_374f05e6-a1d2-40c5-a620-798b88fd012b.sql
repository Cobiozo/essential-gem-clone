
-- ============================================================================
-- TABLE: event_registration_forms
-- ============================================================================
CREATE TABLE public.event_registration_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Zarezerwuj miejsce',
  payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_subject TEXT NOT NULL DEFAULT 'Potwierdzenie rejestracji na wydarzenie',
  email_body TEXT,
  fields_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_registration_forms_event_id ON public.event_registration_forms(event_id);
CREATE INDEX idx_event_registration_forms_slug ON public.event_registration_forms(slug);
CREATE INDEX idx_event_registration_forms_active ON public.event_registration_forms(is_active) WHERE is_active = true;

ALTER TABLE public.event_registration_forms ENABLE ROW LEVEL SECURITY;

-- Public can view active forms (to render the registration page)
CREATE POLICY "Anyone can view active event forms"
  ON public.event_registration_forms FOR SELECT
  USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins manage event forms"
  ON public.event_registration_forms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABLE: paid_event_partner_links
-- ============================================================================
CREATE TABLE public.paid_event_partner_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_user_id UUID NOT NULL,
  form_id UUID NOT NULL REFERENCES public.event_registration_forms(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL UNIQUE,
  click_count INTEGER NOT NULL DEFAULT 0,
  submission_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_user_id, form_id)
);

CREATE INDEX idx_partner_links_partner ON public.paid_event_partner_links(partner_user_id);
CREATE INDEX idx_partner_links_form ON public.paid_event_partner_links(form_id);
CREATE INDEX idx_partner_links_ref ON public.paid_event_partner_links(ref_code);

ALTER TABLE public.paid_event_partner_links ENABLE ROW LEVEL SECURITY;

-- Public can read active links by ref_code (needed when guest clicks invite link)
CREATE POLICY "Anyone can view active partner links"
  ON public.paid_event_partner_links FOR SELECT
  USING (is_active = true);

-- Partners manage their own links
CREATE POLICY "Partners create their own partner links"
  ON public.paid_event_partner_links FOR INSERT
  WITH CHECK (auth.uid() = partner_user_id);

CREATE POLICY "Partners update their own partner links"
  ON public.paid_event_partner_links FOR UPDATE
  USING (auth.uid() = partner_user_id)
  WITH CHECK (auth.uid() = partner_user_id);

-- Admins full access
CREATE POLICY "Admins manage partner links"
  ON public.paid_event_partner_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABLE: event_form_submissions
-- ============================================================================
CREATE TABLE public.event_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.event_registration_forms(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  partner_link_id UUID REFERENCES public.paid_event_partner_links(id) ON DELETE SET NULL,
  partner_user_id UUID,
  submitted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled', 'refunded')),
  email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed', 'bounced')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  confirmation_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  cancellation_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  email_sent_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  payment_marked_at TIMESTAMPTZ,
  payment_marked_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_form_submissions_form ON public.event_form_submissions(form_id);
CREATE INDEX idx_event_form_submissions_event ON public.event_form_submissions(event_id);
CREATE INDEX idx_event_form_submissions_partner ON public.event_form_submissions(partner_user_id);
CREATE INDEX idx_event_form_submissions_partner_link ON public.event_form_submissions(partner_link_id);
CREATE INDEX idx_event_form_submissions_email ON public.event_form_submissions(email);
CREATE INDEX idx_event_form_submissions_status ON public.event_form_submissions(status, payment_status);

ALTER TABLE public.event_form_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit registrations
CREATE POLICY "Anyone can submit event form"
  ON public.event_form_submissions FOR INSERT
  WITH CHECK (true);

-- Partners can view their own (referrals)
CREATE POLICY "Partners view own referred submissions"
  ON public.event_form_submissions FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = partner_user_id);

-- Admins full access
CREATE POLICY "Admins manage event form submissions"
  ON public.event_form_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TIMESTAMP TRIGGERS
-- ============================================================================
CREATE TRIGGER update_event_registration_forms_updated_at
  BEFORE UPDATE ON public.event_registration_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_event_partner_links_updated_at
  BEFORE UPDATE ON public.paid_event_partner_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_form_submissions_updated_at
  BEFORE UPDATE ON public.event_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RPC: confirm_event_form_email
-- ============================================================================
CREATE OR REPLACE FUNCTION public.confirm_event_form_email(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _submission RECORD;
BEGIN
  SELECT id, email_confirmed_at, status, event_id, form_id
  INTO _submission
  FROM public.event_form_submissions
  WHERE confirmation_token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF _submission.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'cancelled');
  END IF;

  IF _submission.email_confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true, 'submission_id', _submission.id);
  END IF;

  UPDATE public.event_form_submissions
  SET email_confirmed_at = now()
  WHERE id = _submission.id;

  RETURN jsonb_build_object('success', true, 'submission_id', _submission.id);
END;
$$;

-- ============================================================================
-- RPC: cancel_event_form_submission
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_event_form_submission(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _submission RECORD;
BEGIN
  SELECT id, payment_status, status
  INTO _submission
  FROM public.event_form_submissions
  WHERE cancellation_token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF _submission.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'already_cancelled', true);
  END IF;

  IF _submission.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_already_received');
  END IF;

  UPDATE public.event_form_submissions
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = 'guest'
  WHERE id = _submission.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- RPC: increment_partner_link_click
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_partner_link_click(_ref_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link RECORD;
BEGIN
  SELECT id, form_id, event_id, partner_user_id, is_active
  INTO _link
  FROM public.paid_event_partner_links
  WHERE ref_code = _ref_code;

  IF NOT FOUND OR NOT _link.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_ref_code');
  END IF;

  UPDATE public.paid_event_partner_links
  SET click_count = click_count + 1
  WHERE id = _link.id;

  RETURN jsonb_build_object(
    'success', true,
    'link_id', _link.id,
    'form_id', _link.form_id,
    'event_id', _link.event_id,
    'partner_user_id', _link.partner_user_id
  );
END;
$$;
