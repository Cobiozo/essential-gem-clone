-- ============================================================
-- API KEYS (inbound) — klucze wydawane zewn. aplikacjom
-- ============================================================
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  CONSTRAINT api_keys_scopes_valid CHECK (
    scopes <@ ARRAY['contacts:read','events:read','registrations:read','autowebinar-stats:read','contacts:write']::text[]
  )
);

CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_created_by ON public.api_keys(created_by);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update api keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete api keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- API KEY USAGE LOG — logi inbound
-- ============================================================
CREATE TABLE public.api_key_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  ip text,
  user_agent text,
  request_size_bytes integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_key_usage_log_key_id ON public.api_key_usage_log(api_key_id, created_at DESC);
CREATE INDEX idx_api_key_usage_log_created_at ON public.api_key_usage_log(created_at DESC);

ALTER TABLE public.api_key_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api key usage log"
  ON public.api_key_usage_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- OUTBOUND INTEGRATIONS — konfiguracja zewn. serwisów
-- ============================================================
CREATE TABLE public.outbound_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  base_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'bearer',
  auth_header_name text NOT NULL DEFAULT 'Authorization',
  default_headers jsonb DEFAULT '{}'::jsonb,
  health_path text,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_test_at timestamptz,
  last_test_status text,
  last_test_message text,
  CONSTRAINT outbound_integrations_auth_type_valid CHECK (
    auth_type IN ('bearer','api_key_header','basic','none')
  ),
  CONSTRAINT outbound_integrations_slug_format CHECK (
    slug ~ '^[a-z0-9_-]{2,40}$'
  ),
  CONSTRAINT outbound_integrations_base_url_https CHECK (
    base_url ~* '^https://'
  )
);

CREATE INDEX idx_outbound_integrations_slug ON public.outbound_integrations(slug);
CREATE INDEX idx_outbound_integrations_enabled ON public.outbound_integrations(enabled) WHERE enabled = true;

ALTER TABLE public.outbound_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outbound integrations"
  ON public.outbound_integrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert outbound integrations"
  ON public.outbound_integrations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update outbound integrations"
  ON public.outbound_integrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete outbound integrations"
  ON public.outbound_integrations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_outbound_integrations_updated_at
  BEFORE UPDATE ON public.outbound_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- OUTBOUND CALL LOG — logi outbound
-- ============================================================
CREATE TABLE public.outbound_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.outbound_integrations(id) ON DELETE CASCADE,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer,
  duration_ms integer,
  error_message text,
  caller_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbound_call_log_integration ON public.outbound_call_log(integration_id, created_at DESC);
CREATE INDEX idx_outbound_call_log_created_at ON public.outbound_call_log(created_at DESC);

ALTER TABLE public.outbound_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outbound call log"
  ON public.outbound_call_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));