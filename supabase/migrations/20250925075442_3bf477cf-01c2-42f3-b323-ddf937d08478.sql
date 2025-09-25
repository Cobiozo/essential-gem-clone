-- Aktualizuj ustawienia widoczności dla sekcji PROMOCJE i INSTRUKCJE
UPDATE cms_sections 
SET 
  visible_to_everyone = true,
  visible_to_anonymous = true,
  updated_at = now()
WHERE title IN ('PROMOCJE', 'INSTRUKCJE (testy, techniczne)') 
  AND is_active = true;