-- Tabela do metadanych plików w bibliotece admina
CREATE TABLE public.admin_media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  original_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL, -- image, video, document, audio, other
  mime_type text,
  storage_bucket text NOT NULL,
  folder text DEFAULT 'admin-library',
  description text,
  tags text[] DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX idx_admin_media_file_type ON admin_media_library(file_type);
CREATE INDEX idx_admin_media_created_at ON admin_media_library(created_at DESC);
CREATE INDEX idx_admin_media_tags ON admin_media_library USING GIN(tags);

-- RLS - tylko administratorzy
ALTER TABLE admin_media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_media_select" ON admin_media_library
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_media_insert" ON admin_media_library
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_media_update" ON admin_media_library
  FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_media_delete" ON admin_media_library
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Trigger dla updated_at
CREATE TRIGGER update_admin_media_library_updated_at
  BEFORE UPDATE ON admin_media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();