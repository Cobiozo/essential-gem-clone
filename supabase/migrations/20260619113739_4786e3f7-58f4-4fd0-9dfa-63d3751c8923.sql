
-- Storage policies for challenge-evidence bucket
-- Bucket must be created manually in Supabase dashboard (private, 10MB limit)

CREATE POLICY "challenge_evidence_user_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'challenge-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "challenge_evidence_user_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'challenge-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = public.challenge_get_peer(auth.uid())::text
  )
);

CREATE POLICY "challenge_evidence_user_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'challenge-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
