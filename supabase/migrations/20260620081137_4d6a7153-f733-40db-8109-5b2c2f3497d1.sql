
DROP POLICY IF EXISTS "challenge_evidence_user_select" ON storage.objects;
CREATE POLICY "challenge_evidence_user_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'challenge-evidence'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "challenge_evidence_user_insert" ON storage.objects;
CREATE POLICY "challenge_evidence_user_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'challenge-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "challenge_evidence_user_delete" ON storage.objects;
CREATE POLICY "challenge_evidence_user_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'challenge-evidence'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "challenge_evidence_user_update" ON storage.objects;
CREATE POLICY "challenge_evidence_user_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'challenge-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
