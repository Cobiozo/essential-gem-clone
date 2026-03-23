
-- Trigger preventing is_completed from reverting from true to false
CREATE OR REPLACE FUNCTION public.protect_training_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Never allow is_completed to revert from true to false
  IF OLD.is_completed = true AND NEW.is_completed = false THEN
    NEW.is_completed = true;
    NEW.completed_at = OLD.completed_at;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid duplicate
DROP TRIGGER IF EXISTS trg_protect_training_completion ON public.training_progress;

CREATE TRIGGER trg_protect_training_completion
  BEFORE UPDATE ON public.training_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_training_completion();
