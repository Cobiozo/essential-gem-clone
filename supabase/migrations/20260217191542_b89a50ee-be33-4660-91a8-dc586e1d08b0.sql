
-- Table for storing short-lived media access tokens
CREATE TABLE public.media_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  real_url TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 5
);

-- Index for fast token lookup
CREATE INDEX idx_media_access_tokens_token ON public.media_access_tokens (token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_media_access_tokens_expires_at ON public.media_access_tokens (expires_at);

-- Enable RLS - no direct access, only via service_role (edge functions)
ALTER TABLE public.media_access_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies = no client access. Only service_role can read/write.

-- Auto-cleanup function for expired tokens (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_expired_media_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.media_access_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
