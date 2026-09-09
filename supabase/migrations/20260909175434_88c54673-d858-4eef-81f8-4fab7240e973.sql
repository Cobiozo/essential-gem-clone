-- P2A: wrap stable RLS functions in scalar subqueries so Postgres evaluates them once (InitPlan)
-- Semantics unchanged: same roles, same PERMISSIVE type, same logical conditions.

-- training_progress
DROP POLICY "Admins can delete training progress" ON public.training_progress;
CREATE POLICY "Admins can delete training progress" ON public.training_progress AS PERMISSIVE FOR DELETE TO public USING ((SELECT public.is_admin()));

DROP POLICY "Admins can insert training progress" ON public.training_progress;
CREATE POLICY "Admins can insert training progress" ON public.training_progress AS PERMISSIVE FOR INSERT TO public WITH CHECK ((SELECT public.is_admin()));

DROP POLICY "Admins can update training progress" ON public.training_progress;
CREATE POLICY "Admins can update training progress" ON public.training_progress AS PERMISSIVE FOR UPDATE TO public USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY "Admins can view all progress" ON public.training_progress;
CREATE POLICY "Admins can view all progress" ON public.training_progress AS PERMISSIVE FOR SELECT TO public USING ((SELECT public.is_admin()));

DROP POLICY "Users can insert own progress" ON public.training_progress;
CREATE POLICY "Users can insert own progress" ON public.training_progress AS PERMISSIVE FOR INSERT TO public WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY "Users can update own progress" ON public.training_progress;
CREATE POLICY "Users can update own progress" ON public.training_progress AS PERMISSIVE FOR UPDATE TO public USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY "Users can view own progress" ON public.training_progress;
CREATE POLICY "Users can view own progress" ON public.training_progress AS PERMISSIVE FOR SELECT TO public USING (((SELECT auth.uid()) = user_id));

-- training_assignments
DROP POLICY "Admins can manage training assignments" ON public.training_assignments;
CREATE POLICY "Admins can manage training assignments" ON public.training_assignments AS PERMISSIVE FOR ALL TO public USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY "Admins can view all training assignments" ON public.training_assignments;
CREATE POLICY "Admins can view all training assignments" ON public.training_assignments AS PERMISSIVE FOR SELECT TO public USING ((SELECT public.is_admin()));

DROP POLICY "Users can view their own training assignments" ON public.training_assignments;
CREATE POLICY "Users can view their own training assignments" ON public.training_assignments AS PERMISSIVE FOR SELECT TO public USING (((SELECT auth.uid()) = user_id));

-- training_lessons
DROP POLICY "Admins can manage lessons" ON public.training_lessons;
CREATE POLICY "Admins can manage lessons" ON public.training_lessons AS PERMISSIVE FOR ALL TO public USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY "Users can view lessons of assigned modules" ON public.training_lessons;
CREATE POLICY "Users can view lessons of assigned modules" ON public.training_lessons AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM public.training_assignments
    WHERE training_assignments.module_id = training_lessons.module_id
      AND training_assignments.user_id = (SELECT auth.uid())
  )
);

DROP POLICY "Users can view lessons of accessible modules" ON public.training_lessons;
CREATE POLICY "Users can view lessons of accessible modules" ON public.training_lessons AS PERMISSIVE FOR SELECT TO public USING (
  (is_active = true) AND (EXISTS (
    SELECT 1 FROM public.training_modules tm
    WHERE tm.id = training_lessons.module_id
      AND tm.is_active = true
      AND (
        ((SELECT public.get_current_user_role()) = 'admin'::text)
        OR (tm.visible_to_everyone = true)
        OR ((tm.visible_to_clients = true) AND ((SELECT public.get_current_user_role()) = ANY (ARRAY['client'::text,'user'::text])))
        OR ((tm.visible_to_partners = true) AND ((SELECT public.get_current_user_role()) = 'partner'::text))
        OR ((tm.visible_to_specjalista = true) AND ((SELECT public.get_current_user_role()) = 'specjalista'::text))
        OR ((tm.visible_to_anonymous = true) AND ((SELECT auth.uid()) IS NULL))
      )
  ))
);

-- training_modules
DROP POLICY "Admins can manage modules" ON public.training_modules;
CREATE POLICY "Admins can manage modules" ON public.training_modules AS PERMISSIVE FOR ALL TO public USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY "Users can view assigned modules" ON public.training_modules;
CREATE POLICY "Users can view assigned modules" ON public.training_modules AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM public.training_assignments
    WHERE training_assignments.module_id = training_modules.id
      AND training_assignments.user_id = (SELECT auth.uid())
  )
);

DROP POLICY "Users can view modules based on role visibility" ON public.training_modules;
CREATE POLICY "Users can view modules based on role visibility" ON public.training_modules AS PERMISSIVE FOR SELECT TO public USING (
  (is_active = true) AND (
    ((SELECT public.get_current_user_role()) = 'admin'::text)
    OR (visible_to_everyone = true)
    OR ((visible_to_clients = true) AND ((SELECT public.get_current_user_role()) = ANY (ARRAY['client'::text,'user'::text])))
    OR ((visible_to_partners = true) AND ((SELECT public.get_current_user_role()) = 'partner'::text))
    OR ((visible_to_specjalista = true) AND ((SELECT public.get_current_user_role()) = 'specjalista'::text))
    OR ((visible_to_anonymous = true) AND ((SELECT auth.uid()) IS NULL))
  )
);