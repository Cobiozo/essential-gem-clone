
-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table
CREATE TABLE public.ai_provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL DEFAULT 'Lovable AI Gateway',
  api_url text NOT NULL DEFAULT 'https://ai.gateway.lovable.dev/v1/chat/completions',
  api_key_encrypted text,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  is_active boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_result boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only 1 active record at a time
CREATE UNIQUE INDEX idx_ai_provider_single_active 
  ON public.ai_provider_config (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON public.ai_provider_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Encrypt function
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'AI_ENCRYPTION_KEY'
  LIMIT 1;
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'AI_ENCRYPTION_KEY not found in vault';
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(plain_key, encryption_key),
    'base64'
  );
END;
$$;

-- Decrypt function
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'AI_ENCRYPTION_KEY'
  LIMIT 1;
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'AI_ENCRYPTION_KEY not found in vault';
  END IF;
  
  RETURN pgp_sym_decrypt(
    decode(encrypted_key, 'base64'),
    encryption_key
  );
END;
$$;

-- Updated_at trigger
CREATE TRIGGER update_ai_provider_config_updated_at
  BEFORE UPDATE ON public.ai_provider_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
