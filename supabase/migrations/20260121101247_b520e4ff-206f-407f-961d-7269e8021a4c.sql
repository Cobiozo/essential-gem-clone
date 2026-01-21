-- =============================================
-- ZMIANA: Pozwól na NULL w assigned_by (automatyczne przypisania nie mają przypisującego)
-- =============================================

ALTER TABLE training_assignments ALTER COLUMN assigned_by DROP NOT NULL;

-- =============================================
-- FAZA 1: Uzupełnienie brakujących przypisań dla istniejących użytkowników
-- =============================================

-- Uzupełnij brakujące przypisania dla PARTNERÓW
INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
SELECT ur.user_id, tm.id, NULL, true
FROM user_roles ur
CROSS JOIN training_modules tm
WHERE ur.role = 'partner'
  AND tm.is_active = true
  AND tm.visible_to_partners = true
  AND NOT EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.user_id = ur.user_id AND ta.module_id = tm.id
  );

-- Uzupełnij brakujące przypisania dla SPECJALISTÓW
INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
SELECT ur.user_id, tm.id, NULL, true
FROM user_roles ur
CROSS JOIN training_modules tm
WHERE ur.role = 'specjalista'
  AND tm.is_active = true
  AND tm.visible_to_specjalista = true
  AND NOT EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.user_id = ur.user_id AND ta.module_id = tm.id
  );

-- Uzupełnij brakujące przypisania dla KLIENTÓW
INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
SELECT ur.user_id, tm.id, NULL, true
FROM user_roles ur
CROSS JOIN training_modules tm
WHERE ur.role IN ('client', 'user')
  AND tm.is_active = true
  AND tm.visible_to_clients = true
  AND NOT EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.user_id = ur.user_id AND ta.module_id = tm.id
  );

-- Uzupełnij brakujące przypisania dla ADMINÓW (wszystkie aktywne moduły)
INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
SELECT ur.user_id, tm.id, NULL, true
FROM user_roles ur
CROSS JOIN training_modules tm
WHERE ur.role = 'admin'
  AND tm.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.user_id = ur.user_id AND ta.module_id = tm.id
  );

-- =============================================
-- FAZA 2: Trigger - Auto-przypisanie przy rejestracji nowego użytkownika
-- =============================================

CREATE OR REPLACE FUNCTION public.assign_training_modules_on_role_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Przypisz moduły widoczne dla roli użytkownika
  INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
  SELECT 
    NEW.user_id,
    tm.id,
    NULL,
    false
  FROM training_modules tm
  WHERE tm.is_active = true
    AND (
      (NEW.role = 'partner' AND tm.visible_to_partners = true) OR
      (NEW.role = 'specjalista' AND tm.visible_to_specjalista = true) OR
      (NEW.role IN ('client', 'user') AND tm.visible_to_clients = true) OR
      (NEW.role = 'admin') OR
      tm.visible_to_everyone = true
    )
  ON CONFLICT (user_id, module_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_assign_training_on_role ON user_roles;
CREATE TRIGGER trigger_assign_training_on_role
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_training_modules_on_role_insert();

-- =============================================
-- FAZA 3: Trigger - Auto-przypisanie przy dodaniu nowego modułu
-- =============================================

CREATE OR REPLACE FUNCTION public.assign_training_module_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Tylko gdy moduł jest aktywny
  IF NEW.is_active = true THEN
    INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
    SELECT 
      ur.user_id,
      NEW.id,
      NULL,
      false
    FROM user_roles ur
    WHERE (
      (ur.role = 'partner' AND NEW.visible_to_partners = true) OR
      (ur.role = 'specjalista' AND NEW.visible_to_specjalista = true) OR
      (ur.role IN ('client', 'user') AND NEW.visible_to_clients = true) OR
      (ur.role = 'admin') OR
      NEW.visible_to_everyone = true
    )
    ON CONFLICT (user_id, module_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_assign_new_module ON training_modules;
CREATE TRIGGER trigger_assign_new_module
  AFTER INSERT ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_training_module_to_users();