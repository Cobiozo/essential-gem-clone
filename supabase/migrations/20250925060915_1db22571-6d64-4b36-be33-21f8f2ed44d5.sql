-- Fix admin_remove_row to properly deactivate child sections
CREATE OR REPLACE FUNCTION public.admin_remove_row(row_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  child_sections_count integer;
BEGIN
  -- Only admins can use it
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Check if the row exists and is a row type
  IF NOT EXISTS (SELECT 1 FROM public.cms_sections WHERE id = row_id AND section_type = 'row') THEN
    RAISE EXCEPTION 'Row not found or is not a row type';
  END IF;

  -- Count child sections for logging
  SELECT COUNT(*) INTO child_sections_count
  FROM public.cms_sections
  WHERE parent_id = row_id AND is_active = true;

  -- Deactivate all child sections of the row
  UPDATE public.cms_sections
  SET is_active = false,
      parent_id = NULL,  -- Remove parent relationship
      updated_at = now()
  WHERE parent_id = row_id;

  -- Deactivate the row itself
  UPDATE public.cms_sections
  SET is_active = false,
      updated_at = now()
  WHERE id = row_id;

  -- Log the result for debugging
  RAISE NOTICE 'Deactivated row % and % child sections', row_id, child_sections_count;

  RETURN TRUE;
END;
$function$;