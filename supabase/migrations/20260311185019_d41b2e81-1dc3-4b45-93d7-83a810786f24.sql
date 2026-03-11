
-- Create function to dynamically update pg_cron schedule from Admin UI
CREATE OR REPLACE FUNCTION public.update_cron_schedule(p_job_name TEXT, p_interval_minutes INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_cron_expression TEXT;
  v_full_job_name TEXT;
  v_function_url TEXT;
  v_anon_key TEXT;
  v_command TEXT;
BEGIN
  -- Only admins can update cron schedules
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Calculate cron expression from interval minutes
  v_cron_expression := CASE p_interval_minutes
    WHEN 1 THEN '* * * * *'
    WHEN 2 THEN '*/2 * * * *'
    WHEN 3 THEN '*/3 * * * *'
    WHEN 5 THEN '*/5 * * * *'
    WHEN 10 THEN '*/10 * * * *'
    WHEN 15 THEN '*/15 * * * *'
    WHEN 20 THEN '*/20 * * * *'
    WHEN 30 THEN '0,30 * * * *'
    WHEN 60 THEN '0 * * * *'
    WHEN 120 THEN '0 */2 * * *'
    WHEN 180 THEN '0 */3 * * *'
    WHEN 240 THEN '0 */4 * * *'
    WHEN 300 THEN '0 */5 * * *'
    WHEN 360 THEN '0 */6 * * *'
    WHEN 480 THEN '0 */8 * * *'
    WHEN 540 THEN '0 */9 * * *'
    WHEN 720 THEN '0 */12 * * *'
    WHEN 1440 THEN '0 0 * * *'
    ELSE '*/5 * * * *'
  END;

  -- Build the job name used in pg_cron
  v_full_job_name := 'invoke-' || p_job_name;

  -- Get function URL and anon key from existing cron job
  SELECT 
    (regexp_match(command, 'url:=''([^'']+)'))[1],
    (regexp_match(command, 'Bearer ([^"]+)'))[1]
  INTO v_function_url, v_anon_key
  FROM cron.job
  WHERE jobname = v_full_job_name
  LIMIT 1;

  -- If job exists, unschedule and reschedule with new expression
  IF v_function_url IS NOT NULL THEN
    PERFORM cron.unschedule(v_full_job_name);
    
    -- Build command string
    v_command := 'SELECT net.http_post(url:=''' || v_function_url || ''', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer ' || v_anon_key || '"}''::jsonb, body:=concat(''{"time": "'', now(), ''"}'')::jsonb) as request_id;';
    
    PERFORM cron.schedule(
      v_full_job_name,
      v_cron_expression,
      v_command
    );
    
    RETURN TRUE;
  ELSE
    RAISE WARNING 'pg_cron job "%" not found, only cron_settings updated', v_full_job_name;
    RETURN FALSE;
  END IF;
END;
$func$;
