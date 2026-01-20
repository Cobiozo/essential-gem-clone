-- Dodaj kolumnę na URL własnego obrazka
ALTER TABLE public.sidebar_footer_icons 
ADD COLUMN image_url TEXT DEFAULT NULL;

-- Dodaj komentarz
COMMENT ON COLUMN public.sidebar_footer_icons.image_url IS 'URL własnego obrazka/logo jako alternatywa dla ikony Lucide';

-- Utwórz bucket storage dla ikon paska bocznego
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sidebar-icons', 'sidebar-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Polityka odczytu - publiczny dostęp
CREATE POLICY "sidebar_icons_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'sidebar-icons');

-- Polityka uploadu - tylko admin
CREATE POLICY "sidebar_icons_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sidebar-icons' 
  AND public.is_admin()
);

-- Polityka aktualizacji - tylko admin
CREATE POLICY "sidebar_icons_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sidebar-icons' 
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'sidebar-icons' 
  AND public.is_admin()
);

-- Polityka usuwania - tylko admin
CREATE POLICY "sidebar_icons_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sidebar-icons' 
  AND public.is_admin()
);