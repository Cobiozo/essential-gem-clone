
CREATE OR REPLACE FUNCTION public.cleanup_expired_guest_tokens()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cleaned integer;
BEGIN
  -- Mark unused guest tokens older than 24h as used
  UPDATE meeting_guest_tokens
  SET used_at = NOW()
  WHERE used_at IS NULL
    AND created_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS cleaned = ROW_COUNT;

  -- Fill missing left_at in guest analytics older than 24h
  UPDATE meeting_guest_analytics
  SET left_at = NOW()
  WHERE left_at IS NULL
    AND joined_at < NOW() - INTERVAL '24 hours';

  RETURN cleaned;
END;
$$;
