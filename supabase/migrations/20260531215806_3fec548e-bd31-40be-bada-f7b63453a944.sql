-- Fix RLS for event-tickets template upserts: UPDATE policy needs WITH CHECK
DROP POLICY IF EXISTS "Admins update event ticket templates" ON storage.objects;

CREATE POLICY "Admins update event ticket templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-tickets'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id = 'event-tickets'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );