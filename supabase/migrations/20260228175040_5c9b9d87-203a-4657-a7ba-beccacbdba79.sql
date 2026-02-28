
CREATE OR REPLACE FUNCTION public.cleanup_expired_guest_tokens()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cleaned integer;
BEGIN
  UPDATE meeting_guest_tokens
  SET is_active = false
  WHERE is_active = true
    AND created_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS cleaned = ROW_COUNT;

  UPDATE meeting_guest_analytics
  SET left_at = NOW()
  WHERE left_at IS NULL
    AND joined_at < NOW() - INTERVAL '24 hours';

  RETURN cleaned;
END;
$$;
