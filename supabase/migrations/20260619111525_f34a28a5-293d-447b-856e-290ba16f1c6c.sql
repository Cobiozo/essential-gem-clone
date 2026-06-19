
-- 1. Extend enums
ALTER TYPE public.challenge_verification_mode ADD VALUE IF NOT EXISTS 'peer';
ALTER TYPE public.challenge_verification_mode ADD VALUE IF NOT EXISTS 'admin_review';
ALTER TYPE public.challenge_task_type ADD VALUE IF NOT EXISTS 'quiz';
ALTER TYPE public.challenge_task_type ADD VALUE IF NOT EXISTS 'external_url';
ALTER TYPE public.challenge_task_type ADD VALUE IF NOT EXISTS 'file_upload';
ALTER TYPE public.challenge_completion_status ADD VALUE IF NOT EXISTS 'pending_review';

-- 2. New columns on challenge_tasks
ALTER TABLE public.challenge_tasks
  ADD COLUMN IF NOT EXISTS requires_evidence boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_evidence_files integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowed_file_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deadline_hours_after_start integer,
  ADD COLUMN IF NOT EXISTS cooldown_minutes integer NOT NULL DEFAULT 0;

-- 3. New columns on challenge_task_completions
ALTER TABLE public.challenge_task_completions
  ADD COLUMN IF NOT EXISTS reviewer_comment text,
  ADD COLUMN IF NOT EXISTS task_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_source text;

-- 4. Peer pairs table
CREATE TABLE IF NOT EXISTS public.challenge_peer_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id uuid NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
  participant_b_id uuid NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
  team_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_peer_pairs_distinct CHECK (participant_a_id <> participant_b_id),
  CONSTRAINT challenge_peer_pairs_unique UNIQUE (participant_a_id, participant_b_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_peer_pairs TO authenticated;
GRANT ALL ON public.challenge_peer_pairs TO service_role;

ALTER TABLE public.challenge_peer_pairs ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage peer pairs"
ON public.challenge_peer_pairs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Participants can see pairs they belong to
CREATE POLICY "Participants see their own pairs"
ON public.challenge_peer_pairs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants p
    WHERE p.id IN (participant_a_id, participant_b_id)
      AND p.user_id = auth.uid()
  )
);

-- 5. Helper: find peer participant id for a given user + task
CREATE OR REPLACE FUNCTION public.challenge_get_peer(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT CASE
    WHEN pp.participant_a_id = me.id THEN pp.participant_b_id
    ELSE pp.participant_a_id
  END
  FROM public.challenge_peer_pairs pp
  JOIN public.challenge_participants me ON me.id IN (pp.participant_a_id, pp.participant_b_id)
  WHERE me.user_id = _user_id
  ORDER BY pp.created_at DESC
  LIMIT 1;
$$;

-- 6. Allow peer to update partner's completion (peer review)
CREATE POLICY "Peer can verify partner completion"
ON public.challenge_task_completions FOR UPDATE
TO authenticated
USING (
  participant_id = public.challenge_get_peer(auth.uid())
)
WITH CHECK (
  participant_id = public.challenge_get_peer(auth.uid())
);

-- 7. Allow peer to see partner's completions (so they can review)
CREATE POLICY "Peer can see partner completions"
ON public.challenge_task_completions FOR SELECT
TO authenticated
USING (
  participant_id = public.challenge_get_peer(auth.uid())
);
