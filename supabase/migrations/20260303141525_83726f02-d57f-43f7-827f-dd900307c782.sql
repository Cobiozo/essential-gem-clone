
-- Krok 1: Rozszerz trigger aby odpalał się też na UPDATE
DROP TRIGGER IF EXISTS trigger_assign_new_module ON public.training_modules;

CREATE TRIGGER trigger_assign_new_module
AFTER INSERT OR UPDATE ON public.training_modules
FOR EACH ROW
EXECUTE FUNCTION public.assign_training_module_to_users();

-- Krok 2: Ustaw widoczność NIEZBĘDNIK KLIENTA dla partnerów
UPDATE public.training_modules
SET visible_to_partners = true, updated_at = now()
WHERE title = 'NIEZBĘDNIK KLIENTA';
