-- Update admin_remove_row to deactivate child sections instead of moving them to top-level
CREATE OR REPLACE FUNCTION public.admin_remove_row(row_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
BEGIN
  -- Only admins can use it
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Deactivate all child sections of the row and detach from parent
  UPDATE public.cms_sections
     SET is_active = false,
         parent_id = NULL,
         updated_at = now()
   WHERE parent_id = row_id;

  -- Deactivate the row itself
  UPDATE public.cms_sections
     SET is_active = false,
         updated_at = now()
   WHERE id = row_id;

  RETURN TRUE;
END;
$function$;