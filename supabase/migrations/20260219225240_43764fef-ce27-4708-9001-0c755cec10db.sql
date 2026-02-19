-- Add can_view_team_progress flag to leader_permissions
ALTER TABLE public.leader_permissions 
ADD COLUMN IF NOT EXISTS can_view_team_progress BOOLEAN DEFAULT false;

-- Create function to get team training progress for a leader
CREATE OR REPLACE FUNCTION public.get_leader_team_training_progress(p_leader_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  eq_id text,
  role text,
  module_id uuid,
  module_title text,
  assigned_at timestamptz,
  is_completed boolean,
  total_lessons bigint,
  completed_lessons bigint,
  progress_percentage numeric,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_eq_id TEXT;
BEGIN
  -- Verify the calling user has can_view_team_progress permission
  IF NOT EXISTS (
    SELECT 1 FROM public.leader_permissions
    WHERE user_id = auth.uid()
    AND can_view_team_progress = true
  ) THEN
    RAISE EXCEPTION 'Access denied: leader team progress permission required';
  END IF;

  -- Get eq_id of the requested leader (must be same as calling user for security)
  IF auth.uid() != p_leader_user_id THEN
    -- Also allow admins to call this for any leader
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: can only view your own team progress';
    END IF;
  END IF;

  SELECT eq_id INTO v_leader_eq_id 
  FROM public.profiles 
  WHERE user_id = p_leader_user_id;

  IF v_leader_eq_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE team AS (
    -- Direct reports of the leader
    SELECT 
      p.user_id, p.first_name, p.last_name, p.eq_id, p.upline_eq_id, p.role, 1 AS level
    FROM public.profiles p
    WHERE p.upline_eq_id = v_leader_eq_id AND p.is_active = true

    UNION ALL

    -- Next levels down
    SELECT 
      p.user_id, p.first_name, p.last_name, p.eq_id, p.upline_eq_id, p.role, t.level + 1
    FROM public.profiles p
    INNER JOIN team t ON p.upline_eq_id = t.eq_id
    WHERE p.is_active = true AND t.level < 10
  )
  SELECT 
    t.user_id,
    t.first_name,
    t.last_name,
    t.eq_id,
    t.role,
    ta.module_id,
    tm.title AS module_title,
    ta.assigned_at,
    ta.is_completed,
    COUNT(tl.id) AS total_lessons,
    COUNT(tp.id) FILTER (WHERE tp.is_completed = true) AS completed_lessons,
    CASE WHEN COUNT(tl.id) > 0 
      THEN ROUND(COUNT(tp.id) FILTER (WHERE tp.is_completed = true)::numeric / COUNT(tl.id) * 100)
      ELSE 0 
    END AS progress_percentage,
    t.level
  FROM team t
  LEFT JOIN public.training_assignments ta ON ta.user_id = t.user_id
  LEFT JOIN public.training_modules tm ON tm.id = ta.module_id AND tm.is_active = true
  LEFT JOIN public.training_lessons tl ON tl.module_id = ta.module_id AND tl.is_active = true
  LEFT JOIN public.training_progress tp ON tp.user_id = t.user_id AND tp.lesson_id = tl.id
  GROUP BY 
    t.user_id, t.first_name, t.last_name, t.eq_id, t.role,
    ta.module_id, tm.title, ta.assigned_at, ta.is_completed, t.level
  ORDER BY t.level, t.last_name, t.first_name, tm.title;
END;
$$;