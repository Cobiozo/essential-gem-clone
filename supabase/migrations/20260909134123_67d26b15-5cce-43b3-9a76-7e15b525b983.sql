
CREATE POLICY "Admins can view cron job locks"
ON public.cron_job_locks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view cron job run stats"
ON public.cron_job_run_stats FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
