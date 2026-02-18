
-- Step 1: Create SECURITY DEFINER function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_meeting_rooms(p_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id FROM meeting_room_participants WHERE user_id = p_user_id AND is_active = true;
$$;

-- Step 2: Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Users can view participants in their room" ON meeting_room_participants;

-- Step 3: Create new non-recursive SELECT policy
CREATE POLICY "Users can view participants in their room" ON meeting_room_participants
  FOR SELECT TO authenticated
  USING (
    room_id IN (SELECT public.get_user_meeting_rooms(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
