-- Function to remove a row (cms_sections with section_type='row') safely
-- Moves child sections to top-level and deactivates the row
CREATE OR REPLACE FUNCTION public.admin_remove_row(row_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  child RECORD;
  new_pos integer;
BEGIN
  -- Only admins can use it
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Move each child section to top-level preserving relative order
  FOR child IN
    SELECT id
    FROM public.cms_sections
    WHERE parent_id = row_id
    ORDER BY position NULLS FIRST
  LOOP
    SELECT COALESCE(MAX(position), -1) + 1 INTO new_pos
    FROM public.cms_sections
    WHERE parent_id IS NULL;

    UPDATE public.cms_sections
    SET parent_id = NULL,
        position = new_pos,
        updated_at = now()
    WHERE id = child.id;
  END LOOP;

  -- Deactivate the row itself
  UPDATE public.cms_sections
  SET is_active = false,
      updated_at = now()
  WHERE id = row_id;

  RETURN TRUE;
END;
$$;