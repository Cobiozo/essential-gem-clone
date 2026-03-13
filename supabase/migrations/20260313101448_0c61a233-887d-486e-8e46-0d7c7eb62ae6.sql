
-- Table for email-based MFA codes
CREATE TABLE public.mfa_email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mfa_email_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own codes" ON public.mfa_email_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage codes" ON public.mfa_email_codes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_mfa_email_codes_user_expires ON public.mfa_email_codes (user_id, expires_at) WHERE used = false;

-- Insert new security_settings keys
INSERT INTO public.security_settings (setting_key, setting_value) VALUES
  ('mfa_method', '"totp"'::jsonb),
  ('report_email', '""'::jsonb),
  ('report_frequency', '"weekly"'::jsonb),
  ('report_enabled', 'false'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
