-- Remove conflicting admin-only policy for training-media uploads
DROP POLICY IF EXISTS "Admins can upload training media" ON storage.objects;

-- Keep only the authenticated users policy (admins are also authenticated)
-- This policy already exists: "Authenticated users can upload training media"