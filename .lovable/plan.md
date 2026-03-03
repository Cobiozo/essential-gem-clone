

# Sortowanie kafelków modułów szkoleniowych wg unlock_order

## Problem
Kafelki modułów wyświetlają się w kolejności z bazy danych (wg `id`/czasu dodania), a nie wg `unlock_order`. Na screenshocie widać, że moduł nr 1 (SZYBKI START) jest na środku, a nr 2 (BIZNESOWE) po lewej.

## Naprawa
Jedna zmiana w `src/pages/Training.tsx` — posortowanie `filteredModules` po `unlock_order` przed renderowaniem w gridzie. Moduły bez `unlock_order` trafią na koniec.

**Zmiana w `filteredModules` (useMemo, linia ~122-127):**
```ts
const filteredModules = useMemo(() => {
  const filtered = !viewLanguage 
    ? modulesWithLockState 
    : modulesWithLockState.filter(m => !m.language_code || m.language_code === viewLanguage);
  
  return filtered.sort((a, b) => (a.unlock_order || 999) - (b.unlock_order || 999));
}, [modulesWithLockState, viewLanguage]);
```

Grid CSS (`md:grid-cols-2 lg:grid-cols-3`) już jest poprawny — renderuje od lewej do prawej, z góry na dół. Wystarczy posortować dane.

## Plik do zmiany
- `src/pages/Training.tsx` — dodanie `.sort()` w `filteredModules`

