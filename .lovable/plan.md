
# Plan: Ulepszenie globalnego zarządzania PureLinkami

## Zdiagnozowany problem

Przycisk "Odśwież wszystkie aktywne linki" tylko aktualizuje `updated_at`, co nie naprawia rzeczywistego problemu. Ręczne wyłączenie/włączenie linku działa, ponieważ wykonuje pełny `UPDATE` z `is_active = false` a potem `is_active = true`.

## Proponowane rozwiązanie

Zastąpienie obecnego przycisku **dwoma nowymi przyciskami** lub jednym przyciskiem z sekwencyjną operacją:

### Wariant A: Jeden przycisk z automatyczną sekwencją
Przycisk "Zresetuj wszystkie aktywne linki" który:
1. Wyłącza wszystkie linki (`is_active = false`)
2. Natychmiast włącza je z powrotem (`is_active = true`)
3. Zwraca liczbę zresetowanych linków

### Wariant B: Dwa oddzielne przyciski (bardziej kontrolowane)
1. **"Wyłącz wszystkie"** - globalnie ustawia `is_active = false`
2. **"Włącz wszystkie"** - globalnie ustawia `is_active = true`

**Rekomendacja:** Wariant A jest bezpieczniejszy (automatyczna sekwencja w jednej transakcji)

---

## Zmiany techniczne

### 1. Nowa funkcja SQL: `reset_all_active_reflinks`

Funkcja wykonująca pełny cykl wyłączenia i włączenia w jednej transakcji:

```sql
CREATE OR REPLACE FUNCTION public.reset_all_active_reflinks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count integer;
  active_link_ids uuid[];
BEGIN
  -- Sprawdź czy użytkownik jest adminem
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reset all reflinks';
  END IF;

  -- Pobierz ID wszystkich aktywnych linków
  SELECT array_agg(id) INTO active_link_ids
  FROM user_reflinks
  WHERE is_active = true
    AND expires_at > now();
  
  IF active_link_ids IS NULL OR array_length(active_link_ids, 1) IS NULL THEN
    RETURN json_build_object('reset_count', 0);
  END IF;
  
  reset_count := array_length(active_link_ids, 1);
  
  -- Krok 1: Wyłącz wszystkie
  UPDATE user_reflinks
  SET is_active = false, updated_at = now()
  WHERE id = ANY(active_link_ids);
  
  -- Krok 2: Włącz z powrotem
  UPDATE user_reflinks
  SET is_active = true, updated_at = now()
  WHERE id = ANY(active_link_ids);
  
  RETURN json_build_object('reset_count', reset_count);
END;
$$;
```

### 2. Aktualizacja przycisku w `UserReflinksSettings.tsx`

Zmiana ikony, tekstu i wywołania funkcji:

```tsx
// Zamiast refresh_all_active_reflinks
const handleResetAllReflinks = async () => {
  if (refreshing) return;
  setRefreshing(true);
  try {
    const { data, error } = await supabase.rpc('reset_all_active_reflinks');
    
    if (error) throw error;
    
    setLastRefreshStats({ updated_count: data.reset_count });
    toast({
      title: 'Zresetowano',
      description: `Zresetowano ${data.reset_count} aktywnych linków (wyłączono i włączono)`,
    });
  } catch (error: any) {
    toast({
      title: 'Błąd',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setRefreshing(false);
  }
};
```

**UI zmiana:**
- Tekst przycisku: "Zresetuj wszystkie aktywne linki"
- Opis: "Ta operacja wyłączy i ponownie włączy wszystkie aktywne purelinki. Użyj tego jeśli linki nie działają poprawnie."

### 3. Bonus: Poprawka `.single()` w Auth.tsx

Zmiana z:
```typescript
.rpc('get_reflink_with_creator', { reflink_code_param: ref })
.single()
```

Na:
```typescript
.rpc('get_reflink_with_creator', { reflink_code_param: ref })
.maybeSingle()
```

To zapobiegnie cichym błędom gdy link nie zostanie znaleziony.

---

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa funkcja `reset_all_active_reflinks` |
| `src/components/admin/UserReflinksSettings.tsx` | Zamiana wywołania `refresh_all_active_reflinks` na `reset_all_active_reflinks` |
| `src/pages/Auth.tsx` | Zmiana `.single()` na `.maybeSingle()` |
| `src/integrations/supabase/types.ts` | Automatyczna aktualizacja typów |

---

## Weryfikacja po wdrożeniu

1. Zaloguj się jako Admin
2. Przejdź do ustawień purelinków
3. Kliknij **"Zresetuj wszystkie aktywne linki"**
4. Sprawdź że wyświetla się liczba zresetowanych linków
5. **Przetestuj link dla specjalisty** - powinien teraz działać bez konieczności ręcznego wyłączania/włączania

---

## Bezpieczeństwo

- Funkcja sprawdza rolę `admin` przed wykonaniem
- Operacja wykonywana w jednej transakcji (atomowa)
- Dotyczy tylko aktywnych, niewygasłych linków
- Wynik jest dokładnie taki sam jak ręczne wyłączenie/włączenie
