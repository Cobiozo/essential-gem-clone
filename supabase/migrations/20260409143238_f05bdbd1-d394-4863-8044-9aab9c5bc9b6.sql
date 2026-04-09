
-- Add column for final warning (29-day warning)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inactivity_final_warning_sent_at timestamptz;

-- New RPC: get users needing final inactivity warning (29 days inactive)
CREATE OR REPLACE FUNCTION public.get_inactive_users_for_final_warning()
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
    AND p.last_seen_at < now() - ((s.block_days - 1) || ' days')::interval
    AND p.inactivity_warning_sent_at IS NOT NULL
    AND p.inactivity_final_warning_sent_at IS NULL
  ORDER BY p.last_seen_at ASC
  LIMIT 10;
$$;

-- Fix blocking RPC: require final warning sent at least 24h ago
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
    AND p.inactivity_final_warning_sent_at IS NOT NULL
    AND p.inactivity_final_warning_sent_at < now() - INTERVAL '24 hours'
  ORDER BY p.last_seen_at ASC
  LIMIT 10;
$$;
