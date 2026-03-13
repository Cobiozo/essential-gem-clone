
-- =============================================
-- MODUŁ BEZPIECZEŃSTWA - Tabele i polityki RLS
-- =============================================

-- 1. Tabela login_audit_log
CREATE TABLE public.login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address text,
  user_agent text,
  city text,
  country text,
  device_hash text,
  login_at timestamptz DEFAULT now(),
  is_suspicious boolean DEFAULT false,
  anomaly_type text
);

ALTER TABLE public.login_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_login_audit_user_id ON public.login_audit_log(user_id);
CREATE INDEX idx_login_audit_login_at ON public.login_audit_log(login_at DESC);
CREATE INDEX idx_login_audit_suspicious ON public.login_audit_log(is_suspicious) WHERE is_suspicious = true;

-- Admins can read all
CREATE POLICY "Admins can read all login audit logs"
  ON public.login_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can read own
CREATE POLICY "Users can read own login audit logs"
  ON public.login_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts (edge function uses service role)
CREATE POLICY "Service insert login audit"
  ON public.login_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Tabela security_alerts
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  severity text DEFAULT 'high',
  details jsonb DEFAULT '{}',
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_security_alerts_user ON public.security_alerts(user_id);
CREATE INDEX idx_security_alerts_unresolved ON public.security_alerts(is_resolved) WHERE is_resolved = false;

CREATE POLICY "Admins can read all security alerts"
  ON public.security_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update security alerts"
  ON public.security_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service insert security alerts"
  ON public.security_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Tabela security_settings
CREATE TABLE public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read security settings"
  ON public.security_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update security settings"
  ON public.security_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert security settings"
  ON public.security_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default settings
INSERT INTO public.security_settings (setting_key, setting_value) VALUES
  ('max_cities_per_hour', '3'::jsonb),
  ('mfa_required_roles', '[]'::jsonb),
  ('mfa_enforcement', 'false'::jsonb),
  ('auto_block_on_anomaly', 'true'::jsonb);
