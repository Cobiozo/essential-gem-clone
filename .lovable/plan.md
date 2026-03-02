
# Naprawa automatycznego zatwierdzania ukończonych szkoleń

## Problem
Gdy użytkownik ukończy 100% lekcji w module, flaga `training_assignments.is_completed` nie zawsze zostaje ustawiona na `true`. Dzieje się tak ponieważ jedyny punkt ustawiający tę flagę to kliknięcie "Następna lekcja" na OSTATNIEJ lekcji w `TrainingModule.tsx`. Jeśli użytkownik:
- zamknie stronę po obejrzeniu ostatniej lekcji
- admin zatwierdzi pojedyncze lekcje ręcznie
- strona się odświeży w trakcie

...to `is_completed` nigdy nie zostanie ustawione.

**Potwierdzenie w bazie**: Elżbieta Krzyżaniak ma `completed_lessons=18`, `total_lessons=18` ale `is_completed=false` dla modułu PRODUKTOWE.

## Rozwiązanie: trójwarstwowe zabezpieczenie

### Warstwa 1: Trigger bazodanowy (główne zabezpieczenie)

Nowy trigger na tabeli `training_progress` -- po każdym INSERT/UPDATE sprawdza, czy wszystkie aktywne lekcje danego modułu są ukończone. Jeśli tak, automatycznie ustawia `training_assignments.is_completed = true`.

```sql
CREATE OR REPLACE FUNCTION public.auto_complete_training_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_module_id uuid;
  v_total_lessons int;
  v_completed_lessons int;
BEGIN
  -- Znajdź moduł dla tej lekcji
  SELECT module_id INTO v_module_id
  FROM training_lessons WHERE id = NEW.lesson_id;

  IF v_module_id IS NULL THEN RETURN NEW; END IF;

  -- Tylko jeśli lekcja została ukończona
  IF NEW.is_completed = true THEN
    -- Policz lekcje
    SELECT COUNT(*) INTO v_total_lessons
    FROM training_lessons
    WHERE module_id = v_module_id AND is_active = true;

    SELECT COUNT(*) INTO v_completed_lessons
    FROM training_progress tp
    JOIN training_lessons tl ON tl.id = tp.lesson_id
    WHERE tp.user_id = NEW.user_id
      AND tl.module_id = v_module_id
      AND tl.is_active = true
      AND tp.is_completed = true;

    -- Jeśli wszystkie ukończone -> zaktualizuj assignment
    IF v_completed_lessons >= v_total_lessons AND v_total_lessons > 0 THEN
      UPDATE training_assignments
      SET is_completed = true,
          completed_at = COALESCE(completed_at, now()),
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND module_id = v_module_id
        AND is_completed = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_complete_training
AFTER INSERT OR UPDATE ON training_progress
FOR EACH ROW
EXECUTE FUNCTION auto_complete_training_assignment();
```

To rozwiązuje problem na stałe -- niezależnie od tego JAK lekcja zostanie ukończona (frontend, admin, API), trigger automatycznie zaktualizuje assignment.

### Warstwa 2: Auto-naprawa w panelu admina

**Plik: `src/components/admin/TrainingManagement.tsx`**

W funkcji `fetchUserProgress`, po zbudowaniu `userProgressMap`, dodanie logiki auto-naprawy: jeśli `progress_percentage === 100` ale `is_completed === false`, automatyczne wywołanie UPDATE w tle (jednorazowa naprawa istniejących niespójnych danych).

Dodatkowo zmiana warunku wyświetlania przycisku "Zatwierdź":
- Obecny: `{!module.is_completed && (...)}`
- Nowy: `{!module.is_completed && module.progress_percentage < 100 && (...)}`

Gdy postęp = 100%, przycisk "Zatwierdź" jest zbędny (trigger już powinien zatwierdzić).

### Warstwa 3: Zabezpieczenie w TrainingModule.tsx

**Plik: `src/pages/TrainingModule.tsx`**

Dodanie sprawdzenia ukończenia modułu po KAŻDYM upsert postępu lekcji (linia ~936), nie tylko przy kliknięciu "Następna" na ostatniej lekcji. Po zapisie postępu, jeśli wszystkie lekcje w module są ukończone, ustawienie `is_completed = true` (redundancja z triggerem, ale dodatkowe zabezpieczenie po stronie frontend).

## Naprawa istniejących danych

Jednorazowa migracja SQL naprawi WSZYSTKIE istniejące niespójności w bazie:

```sql
UPDATE training_assignments ta
SET is_completed = true,
    completed_at = COALESCE(ta.completed_at, now()),
    updated_at = now()
WHERE ta.is_completed = false
  AND (
    SELECT COUNT(*) FROM training_lessons tl
    WHERE tl.module_id = ta.module_id AND tl.is_active = true
  ) > 0
  AND (
    SELECT COUNT(*) FROM training_lessons tl
    WHERE tl.module_id = ta.module_id AND tl.is_active = true
  ) = (
    SELECT COUNT(*) FROM training_progress tp
    JOIN training_lessons tl ON tl.id = tp.lesson_id
    WHERE tp.user_id = ta.user_id
      AND tl.module_id = ta.module_id
      AND tl.is_active = true
      AND tp.is_completed = true
  );
```

## Pliki do zmiany
1. **Migracja SQL** -- trigger `auto_complete_training_assignment` + jednorazowa naprawa danych
2. `src/components/admin/TrainingManagement.tsx` -- ukrycie przycisku "Zatwierdź" przy 100% + auto-naprawa w fetchUserProgress
3. `src/pages/TrainingModule.tsx` -- sprawdzenie ukończenia modułu po każdym zapisie lekcji

## Oczekiwany rezultat
- Elżbieta Krzyżaniak (i inni z 100% postępem) zostaną automatycznie naprawieni
- Każde przyszłe ukończenie ostatniej lekcji w module automatycznie ustawi `is_completed = true` dzięki triggerowi
- Przycisk "Zatwierdź" nie pojawia się gdy moduł ma 100% postępu
- Problem nie może się powtórzyć niezależnie od sposobu ukończenia lekcji
