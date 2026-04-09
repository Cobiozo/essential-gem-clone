
-- Table for inactivity configuration
CREATE TABLE IF NOT EXISTS public.inactivity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_days integer NOT NULL DEFAULT 14,
  block_days integer NOT NULL DEFAULT 30,
  support_email text NOT NULL DEFAULT 'support@purelife.info.pl',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inactivity_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/update
CREATE POLICY "Admins can read inactivity_settings"
  ON public.inactivity_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inactivity_settings"
  ON public.inactivity_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.inactivity_settings (warning_days, block_days, support_email, is_enabled)
VALUES (14, 30, 'support@purelife.info.pl', true);

-- RPC: get users needing inactivity warning
CREATE OR REPLACE FUNCTION public.get_inactive_users_for_warning()
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, days_inactive integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    EXTRACT(DAY FROM now() - p.last_seen_at)::integer AS days_inactive
  FROM profiles p
  CROSS JOIN inactivity_settings s
  WHERE s.is_enabled = true
    AND p.is_active = true
    AND p.last_seen_at IS NOT NULL
    AND p.last_seen_at < now() - (s.warning_days || ' days')::interval
    AND (
      p.inactivity_warning_sent_at IS NULL
      OR p.inactivity_warning_sent_at < p.last_seen_at
    )
  ORDER BY p.last_seen_at ASC
  LIMIT 10;
$$;

-- RPC: get users needing inactivity blocking
CREATE OR REPLACE FUNCTION public.get_inactive_users_for_blocking()
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, days_inactive integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    EXTRACT(DAY FROM now() - p.last_seen_at)::integer AS days_inactive
  FROM profiles p
  CROSS JOIN inactivity_settings s
  WHERE s.is_enabled = true
    AND p.is_active = true
    AND p.last_seen_at IS NOT NULL
    AND p.last_seen_at < now() - (s.block_days || ' days')::interval
  ORDER BY p.last_seen_at ASC
  LIMIT 10;
$$;
