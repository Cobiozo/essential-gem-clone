-- =====================================================
-- MODUŁ "ZDROWA WIEDZA" - Tabele, RLS, Storage
-- =====================================================

-- 1. Tabela główna: healthy_knowledge
CREATE TABLE public.healthy_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Podstawowe informacje
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  
  -- Typ i źródło materiału
  content_type TEXT NOT NULL DEFAULT 'document', -- 'video', 'audio', 'document', 'image', 'text'
  media_url TEXT,
  text_content TEXT,
  file_name TEXT,
  file_size INTEGER,
  duration_seconds INTEGER,
  
  -- Widoczność (role wewnątrz platformy)
  visible_to_admin BOOLEAN DEFAULT true,
  visible_to_partner BOOLEAN DEFAULT false,
  visible_to_client BOOLEAN DEFAULT false,
  visible_to_specjalista BOOLEAN DEFAULT false,
  visible_to_everyone BOOLEAN DEFAULT false,
  
  -- Ustawienia OTP (dla udostępniania zewnętrznego)
  allow_external_share BOOLEAN DEFAULT false,
  otp_validity_hours INTEGER DEFAULT 24,
  otp_max_sessions INTEGER DEFAULT 3,
  share_message_template TEXT,
  
  -- Metadane
  category TEXT,
  tags TEXT[],
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indeksy dla healthy_knowledge
CREATE INDEX idx_healthy_knowledge_slug ON healthy_knowledge(slug);
CREATE INDEX idx_healthy_knowledge_active ON healthy_knowledge(is_active);
CREATE INDEX idx_healthy_knowledge_position ON healthy_knowledge(position);
CREATE INDEX idx_healthy_knowledge_category ON healthy_knowledge(category);
CREATE INDEX idx_healthy_knowledge_featured ON healthy_knowledge(is_featured) WHERE is_featured = true;

-- 2. Tabela kodów OTP: hk_otp_codes
CREATE TABLE public.hk_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES healthy_knowledge(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id),
  
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_invalidated BOOLEAN DEFAULT false,
  used_sessions INTEGER DEFAULT 0,
  
  recipient_name TEXT,
  recipient_email TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla hk_otp_codes
CREATE INDEX idx_hk_otp_codes_code ON hk_otp_codes(code);
CREATE INDEX idx_hk_otp_codes_knowledge ON hk_otp_codes(knowledge_id);
CREATE INDEX idx_hk_otp_codes_partner ON hk_otp_codes(partner_id);
CREATE INDEX idx_hk_otp_codes_expires ON hk_otp_codes(expires_at);
CREATE INDEX idx_hk_otp_codes_active ON hk_otp_codes(is_invalidated, expires_at) 
  WHERE is_invalidated = false;

-- 3. Tabela sesji: hk_otp_sessions
CREATE TABLE public.hk_otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otp_code_id UUID NOT NULL REFERENCES hk_otp_codes(id) ON DELETE CASCADE,
  
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla hk_otp_sessions
CREATE INDEX idx_hk_sessions_token ON hk_otp_sessions(session_token);
CREATE INDEX idx_hk_sessions_expires ON hk_otp_sessions(expires_at);
CREATE INDEX idx_hk_sessions_otp_code ON hk_otp_sessions(otp_code_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- healthy_knowledge RLS
ALTER TABLE healthy_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_admin_full_access" ON healthy_knowledge
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "hk_role_based_read" ON healthy_knowledge
  FOR SELECT TO authenticated
  USING (
    is_active = true AND (
      visible_to_everyone = true OR
      public.is_admin() OR
      (visible_to_partner = true AND public.has_role(auth.uid(), 'partner')) OR
      (visible_to_client = true AND (public.has_role(auth.uid(), 'client') OR public.has_role(auth.uid(), 'user'))) OR
      (visible_to_specjalista = true AND public.has_role(auth.uid(), 'specjalista'))
    )
  );

-- hk_otp_codes RLS
ALTER TABLE hk_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_codes_partner_read_own" ON hk_otp_codes
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin());

CREATE POLICY "hk_codes_partner_create" ON hk_otp_codes
  FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "hk_codes_partner_update_own" ON hk_otp_codes
  FOR UPDATE TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin())
  WITH CHECK (partner_id = auth.uid() OR public.is_admin());

CREATE POLICY "hk_codes_admin_delete" ON hk_otp_codes
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- hk_otp_sessions RLS (tylko service role)
ALTER TABLE hk_otp_sessions ENABLE ROW LEVEL SECURITY;

-- Brak polityk dla authenticated - dostęp tylko przez Edge Functions z service_role

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'healthy-knowledge', 
  'healthy-knowledge', 
  false,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies
CREATE POLICY "hk_storage_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'healthy-knowledge' AND
    public.is_admin()
  );

CREATE POLICY "hk_storage_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'healthy-knowledge' AND public.is_admin())
  WITH CHECK (bucket_id = 'healthy-knowledge' AND public.is_admin());

CREATE POLICY "hk_storage_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'healthy-knowledge' AND public.is_admin());

CREATE POLICY "hk_storage_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'healthy-knowledge');

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE TRIGGER update_healthy_knowledge_updated_at
  BEFORE UPDATE ON healthy_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();