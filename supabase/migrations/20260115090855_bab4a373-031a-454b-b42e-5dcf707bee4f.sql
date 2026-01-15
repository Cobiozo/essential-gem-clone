-- Rozszerzenie tabeli reflinks o pola OTP
ALTER TABLE public.reflinks ADD COLUMN IF NOT EXISTS 
  welcome_message TEXT;

ALTER TABLE public.reflinks ADD COLUMN IF NOT EXISTS 
  protected_content TEXT;

ALTER TABLE public.reflinks ADD COLUMN IF NOT EXISTS 
  otp_validity_hours INTEGER DEFAULT 24;

ALTER TABLE public.reflinks ADD COLUMN IF NOT EXISTS 
  otp_max_sessions INTEGER DEFAULT 1;

ALTER TABLE public.reflinks ADD COLUMN IF NOT EXISTS 
  slug TEXT;

ALTER TABLE public.reflinks ADD COLUMN IF NOT EXISTS 
  requires_otp BOOLEAN DEFAULT false;

-- Unikalny indeks na slug (tylko dla niepustych wartości)
CREATE UNIQUE INDEX IF NOT EXISTS reflinks_slug_unique 
  ON public.reflinks(slug) 
  WHERE slug IS NOT NULL AND slug != '';

-- Tabela kodów OTP
CREATE TABLE IF NOT EXISTS public.infolink_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflink_id UUID REFERENCES public.reflinks(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_invalidated BOOLEAN DEFAULT false,
  used_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela sesji dostępu
CREATE TABLE IF NOT EXISTS public.infolink_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otp_code_id UUID REFERENCES public.infolink_otp_codes(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now()
);

-- RLS dla infolink_otp_codes
ALTER TABLE public.infolink_otp_codes ENABLE ROW LEVEL SECURITY;

-- Partnerzy mogą widzieć swoje kody
CREATE POLICY "Partners can view their own OTP codes"
  ON public.infolink_otp_codes
  FOR SELECT
  USING (auth.uid() = partner_id);

-- Partnerzy mogą tworzyć kody
CREATE POLICY "Partners can create OTP codes"
  ON public.infolink_otp_codes
  FOR INSERT
  WITH CHECK (auth.uid() = partner_id);

-- Admini mogą wszystko
CREATE POLICY "Admins can manage all OTP codes"
  ON public.infolink_otp_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS dla infolink_sessions
ALTER TABLE public.infolink_sessions ENABLE ROW LEVEL SECURITY;

-- Publiczny dostęp do odczytu sesji (weryfikacja przez token)
CREATE POLICY "Anyone can read sessions by token"
  ON public.infolink_sessions
  FOR SELECT
  USING (true);

-- Wstawianie sesji przez funkcje (bez RLS - obsługiwane przez edge function)
CREATE POLICY "Sessions can be created"
  ON public.infolink_sessions
  FOR INSERT
  WITH CHECK (true);

-- Aktualizacja sesji
CREATE POLICY "Sessions can be updated"
  ON public.infolink_sessions
  FOR UPDATE
  USING (true);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON public.infolink_otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_reflink ON public.infolink_otp_codes(reflink_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON public.infolink_otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.infolink_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.infolink_sessions(expires_at);