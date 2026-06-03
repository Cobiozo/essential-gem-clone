-- Backfill guardian denormalized fields from authoritative upline_eq_id
UPDATE public.profiles p
SET 
  upline_first_name = g.first_name,
  upline_last_name = g.last_name,
  guardian_name = NULLIF(TRIM(COALESCE(g.first_name, '') || ' ' || COALESCE(g.last_name, '')), ''),
  updated_at = NOW()
FROM public.profiles g
WHERE p.upline_eq_id IS NOT NULL
  AND g.eq_id = p.upline_eq_id
  AND (
    COALESCE(p.upline_first_name, '') <> COALESCE(g.first_name, '')
    OR COALESCE(p.upline_last_name, '') <> COALESCE(g.last_name, '')
    OR COALESCE(p.guardian_name, '') <> NULLIF(TRIM(COALESCE(g.first_name, '') || ' ' || COALESCE(g.last_name, '')), '')
  );

-- Trigger function: when a profile changes first_name/last_name/eq_id,
-- propagate to all downline profiles where upline_eq_id matches.
CREATE OR REPLACE FUNCTION public.sync_downline_guardian_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If eq_id changed, move references from OLD.eq_id to NEW.eq_id and refresh names
  IF NEW.eq_id IS DISTINCT FROM OLD.eq_id AND OLD.eq_id IS NOT NULL THEN
    UPDATE public.profiles
    SET upline_eq_id = NEW.eq_id,
        upline_first_name = NEW.first_name,
        upline_last_name = NEW.last_name,
        guardian_name = NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
        updated_at = NOW()
    WHERE upline_eq_id = OLD.eq_id;
  END IF;

  -- If first_name/last_name changed, refresh names in downline records pointing to NEW.eq_id
  IF (NEW.first_name IS DISTINCT FROM OLD.first_name
      OR NEW.last_name IS DISTINCT FROM OLD.last_name)
     AND NEW.eq_id IS NOT NULL THEN
    UPDATE public.profiles
    SET upline_first_name = NEW.first_name,
        upline_last_name = NEW.last_name,
        guardian_name = NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
        updated_at = NOW()
    WHERE upline_eq_id = NEW.eq_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_downline_guardian_fields ON public.profiles;
CREATE TRIGGER trg_sync_downline_guardian_fields
AFTER UPDATE OF first_name, last_name, eq_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_downline_guardian_fields();