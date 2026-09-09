
CREATE TABLE IF NOT EXISTS public.cron_job_locks (
  job_name text PRIMARY KEY,
  run_id uuid NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT SELECT ON public.cron_job_locks TO authenticated;
GRANT ALL ON public.cron_job_locks TO service_role;
ALTER TABLE public.cron_job_locks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cron_job_run_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  run_id uuid,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_cron_job_run_stats_job_started
  ON public.cron_job_run_stats (job_name, started_at DESC);

GRANT SELECT ON public.cron_job_run_stats TO authenticated;
GRANT ALL ON public.cron_job_run_stats TO service_role;
ALTER TABLE public.cron_job_run_stats ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.try_acquire_cron_lock(_job_name text, _ttl_seconds integer DEFAULT 300)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _run_id uuid := gen_random_uuid();
  _acquired boolean;
BEGIN
  -- serialize concurrent acquisition attempts for this job name (transaction-scoped,
  -- always released at commit/rollback - it can never leak)
  IF NOT pg_try_advisory_xact_lock(hashtext('cron_job_lock:' || _job_name)) THEN
    INSERT INTO public.cron_job_run_stats (job_name, status, started_at, finished_at, duration_ms)
    VALUES (_job_name, 'skipped', now(), now(), 0);
    RETURN NULL;
  END IF;

  DELETE FROM public.cron_job_locks WHERE job_name = _job_name AND expires_at < now();

  INSERT INTO public.cron_job_locks (job_name, run_id, locked_at, expires_at)
  VALUES (_job_name, _run_id, now(), now() + make_interval(secs => GREATEST(_ttl_seconds, 30)))
  ON CONFLICT (job_name) DO NOTHING;

  GET DIAGNOSTICS _acquired = ROW_COUNT;

  IF NOT _acquired THEN
    INSERT INTO public.cron_job_run_stats (job_name, status, started_at, finished_at, duration_ms)
    VALUES (_job_name, 'skipped', now(), now(), 0);
    RETURN NULL;
  END IF;

  INSERT INTO public.cron_job_run_stats (job_name, run_id, status, started_at)
  VALUES (_job_name, _run_id, 'running', now());

  RETURN _run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_cron_lock(
  _job_name text,
  _run_id uuid,
  _status text DEFAULT 'completed',
  _error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  DELETE FROM public.cron_job_locks WHERE job_name = _job_name AND run_id = _run_id;

  UPDATE public.cron_job_run_stats
     SET status = COALESCE(_status, 'completed'),
         finished_at = now(),
         duration_ms = GREATEST(0, (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer),
         error_message = _error_message
   WHERE run_id = _run_id AND job_name = _job_name AND status = 'running';
END;
$$;

REVOKE ALL ON FUNCTION public.try_acquire_cron_lock(text, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_cron_lock(text, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_cron_lock(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_cron_lock(text, uuid, text, text) TO service_role;
