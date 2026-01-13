-- =====================================================
-- COMPLETE FIX: Infinite recursion in RLS policies
-- =====================================================

-- 1. Create SECURITY DEFINER function to check admin status (avoids recursion)
CREATE OR REPLACE FUNCTION public.check_is_admin_for_events()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- 2. Fix events table policies
DROP POLICY IF EXISTS "users_view_events_by_role" ON public.events;
DROP POLICY IF EXISTS "admins_manage_events" ON public.events;
DROP POLICY IF EXISTS "leaders_manage_own_private_events" ON public.events;
DROP POLICY IF EXISTS "events_admin_full_access" ON public.events;
DROP POLICY IF EXISTS "events_select_for_users" ON public.events;
DROP POLICY IF EXISTS "events_leaders_manage_own" ON public.events;

CREATE POLICY "events_admin_full_access" ON public.events
FOR ALL USING (public.check_is_admin_for_events());

CREATE POLICY "events_select_for_users" ON public.events
FOR SELECT USING (
  is_active = true AND (
    visible_to_everyone = true OR
    auth.uid() = created_by OR
    auth.uid() = host_user_id OR
    EXISTS (
      SELECT 1 FROM public.event_registrations 
      WHERE event_registrations.event_id = events.id 
      AND event_registrations.user_id = auth.uid()
    )
  )
);

CREATE POLICY "events_leaders_manage_own" ON public.events
FOR ALL USING (
  auth.uid() = host_user_id AND event_type = 'private_meeting'
);

-- 3. Fix leader_permissions policies
DROP POLICY IF EXISTS "admins_manage_leader_permissions" ON public.leader_permissions;
DROP POLICY IF EXISTS "leaders_view_own_permissions" ON public.leader_permissions;
DROP POLICY IF EXISTS "leader_permissions_admin_access" ON public.leader_permissions;
DROP POLICY IF EXISTS "leader_permissions_user_view_own" ON public.leader_permissions;

CREATE POLICY "leader_permissions_admin_access" ON public.leader_permissions
FOR ALL USING (public.check_is_admin_for_events());

CREATE POLICY "leader_permissions_user_view_own" ON public.leader_permissions
FOR SELECT USING (auth.uid() = user_id);

-- 4. Fix leader_meeting_topics policies
DROP POLICY IF EXISTS "admins_manage_meeting_topics" ON public.leader_meeting_topics;
DROP POLICY IF EXISTS "authenticated_view_topics" ON public.leader_meeting_topics;
DROP POLICY IF EXISTS "meeting_topics_admin_access" ON public.leader_meeting_topics;
DROP POLICY IF EXISTS "meeting_topics_authenticated_view" ON public.leader_meeting_topics;

CREATE POLICY "meeting_topics_admin_access" ON public.leader_meeting_topics
FOR ALL USING (public.check_is_admin_for_events());

CREATE POLICY "meeting_topics_authenticated_view" ON public.leader_meeting_topics
FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- 5. Fix leader_availability policies (correct column: leader_user_id)
DROP POLICY IF EXISTS "leaders_manage_own_availability" ON public.leader_availability;
DROP POLICY IF EXISTS "authenticated_view_availability" ON public.leader_availability;
DROP POLICY IF EXISTS "availability_leader_manage_own" ON public.leader_availability;
DROP POLICY IF EXISTS "availability_authenticated_view" ON public.leader_availability;
DROP POLICY IF EXISTS "availability_admin_access" ON public.leader_availability;

CREATE POLICY "availability_leader_manage_own" ON public.leader_availability
FOR ALL USING (auth.uid() = leader_user_id);

CREATE POLICY "availability_authenticated_view" ON public.leader_availability
FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "availability_admin_access" ON public.leader_availability
FOR ALL USING (public.check_is_admin_for_events());

-- 6. Fix event_registrations policies
DROP POLICY IF EXISTS "users_manage_own_registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "admins_view_all_registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "registrations_user_manage_own" ON public.event_registrations;
DROP POLICY IF EXISTS "registrations_admin_access" ON public.event_registrations;

CREATE POLICY "registrations_user_manage_own" ON public.event_registrations
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "registrations_admin_access" ON public.event_registrations
FOR ALL USING (public.check_is_admin_for_events());

-- 7. Fix events_settings policies
DROP POLICY IF EXISTS "admins_manage_events_settings" ON public.events_settings;
DROP POLICY IF EXISTS "authenticated_view_events_settings" ON public.events_settings;
DROP POLICY IF EXISTS "events_settings_admin_access" ON public.events_settings;
DROP POLICY IF EXISTS "events_settings_authenticated_view" ON public.events_settings;

CREATE POLICY "events_settings_admin_access" ON public.events_settings
FOR ALL USING (public.check_is_admin_for_events());

CREATE POLICY "events_settings_authenticated_view" ON public.events_settings
FOR SELECT USING (auth.uid() IS NOT NULL);