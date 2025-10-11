-- Create function to set default certificate template atomically
CREATE OR REPLACE FUNCTION public.set_default_certificate_template(template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can use this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Deactivate all templates
  UPDATE public.certificate_templates
  SET is_active = false
  WHERE is_active = true;

  -- Activate the selected template
  UPDATE public.certificate_templates
  SET is_active = true, updated_at = now()
  WHERE id = template_id;
END;
$$;