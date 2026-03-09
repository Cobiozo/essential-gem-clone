

# Naprawa stanu modułu po dodaniu nowych lekcji

## Problem
Gdy admin doda nowe lekcje do ukończonego modułu, użytkownik widzi nieaktualny stan: "Ukończony", "2/2" zamiast "2/4", certyfikat wygenerowany. Brak informacji o konieczności nadrobienia.

## Analiza kodu

Frontend (`Training.tsx`) **już prawidłowo liczy** lekcje i postęp z bazy (linie 438-458). Flaga `has_new_lessons` (linia 445) jest ustawiana gdy `completedLessons < relevantLessonsCount` i istnieje certyfikat. Sekcja certyfikatu pokazuje się tylko przy `progress === 100` (linia 853).

**Brakujące elementy:**
1. `training_assignments.is_completed` nie jest resetowane po dodaniu lekcji — wpływa na panel lidera i admin
2. Certyfikat w bazie nie jest unieważniany — może wprowadzać w błąd w innych widokach
3. Brak auto-naprawy przy ładowaniu strony Akademii

## Zmiany

### 1. Auto-naprawa w `src/pages/Training.tsx` — `fetchTrainingModules()`

Po linii 458 (po mapowaniu `modulesWithProgress`), dodać logikę auto-naprawy:

```typescript
// Auto-repair: reset is_completed and invalidate certificate when new lessons detected
const repairPromises: Promise<any>[] = [];
modulesWithProgress.forEach((mod: any) => {
  if (mod.has_new_lessons) {
    // Reset assignment completion
    repairPromises.push(
      supabase
        .from('training_assignments')
        .update({ is_completed: false, completed_at: null })
        .eq('user_id', user!.id)
        .eq('module_id', mod.id)
        .eq('is_completed', true)
    );
    // Invalidate certificate - mark as requiring renewal
    if (certMap[mod.id]) {
      repairPromises.push(
        supabase
          .from('certificates')
          .update({ is_valid: false })
          .eq('id', certMap[mod.id].id)
      );
      // Remove from local cert map so UI doesn't show it
      delete certMap[mod.id];
    }
  }
});

if (repairPromises.length > 0) {
  await Promise.allSettled(repairPromises);
  setCertificates({...certMap}); // Update local state without invalidated certs
}
```

### 2. Sprawdzić/dodać kolumnę `is_valid` w tabeli `certificates`

Sprawdzę czy kolumna istnieje. Jeśli nie — alternatywnie usunąć rekord certyfikatu lub użyć istniejącego pola.

### 3. Zabezpieczenie sekcji certyfikatu w UI (linia 853)

Zmienić warunek z `progress === 100` na `progress === 100 && !module.has_new_lessons`:

```tsx
{progress === 100 && !module.has_new_lessons && (() => {
```

### 4. Dashboard widget `TrainingProgressWidget.tsx`

Już korzysta z `fetchBatchModuleProgress` który liczy aktywne lekcje — tu jest OK.

## Efekt
- Użytkownik widzi "2/4" i "Wymaga uzupełnienia" zamiast "2/2" i "Ukończony"
- Certyfikat znika z karty modułu
- `is_completed` w bazie jest naprawiane automatycznie
- Po ukończeniu brakujących lekcji, certyfikat można wygenerować na nowo

