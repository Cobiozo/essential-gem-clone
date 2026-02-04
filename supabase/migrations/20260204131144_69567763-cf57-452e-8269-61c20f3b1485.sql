-- Usunięcie zduplikowanych polityk (które nie mają roli TO authenticated)
-- Pozostawienie starych polityk hk_storage_admin_* które działają poprawnie

DROP POLICY IF EXISTS "Admins can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update healthy-knowledge files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from healthy-knowledge" ON storage.objects;