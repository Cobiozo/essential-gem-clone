
ALTER TABLE public.leader_permissions
  ADD COLUMN IF NOT EXISTS tripartite_visibility_scope text NOT NULL DEFAULT 'upline_only',
  ADD COLUMN IF NOT EXISTS consultation_visibility_scope text NOT NULL DEFAULT 'upline_only';

ALTER TABLE public.leader_permissions
  DROP CONSTRAINT IF EXISTS leader_permissions_tripartite_visibility_scope_check;
ALTER TABLE public.leader_permissions
  ADD CONSTRAINT leader_permissions_tripartite_visibility_scope_check
  CHECK (tripartite_visibility_scope IN ('upline_only','everyone'));

ALTER TABLE public.leader_permissions
  DROP CONSTRAINT IF EXISTS leader_permissions_consultation_visibility_scope_check;
ALTER TABLE public.leader_permissions
  ADD CONSTRAINT leader_permissions_consultation_visibility_scope_check
  CHECK (consultation_visibility_scope IN ('upline_only','everyone'));

UPDATE public.leader_permissions
   SET tripartite_visibility_scope = COALESCE(calendar_visibility_scope, 'upline_only'),
       consultation_visibility_scope = COALESCE(calendar_visibility_scope, 'upline_only')
 WHERE calendar_visibility_scope IS NOT NULL;
