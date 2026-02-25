

## Kolejność odsłaniania modułów -- podział na języki

### Problem

Obecnie `unlock_order` jest globalny -- jeden numer na moduł niezależnie od języka. Administrator nie widzi podziału na języki i nie może ustawić osobnej kolejności np. "1, 2, 3" dla polskich modułów i "1, 2, 3" dla niemieckich. Logika w `Training.tsx` też nie filtruje sekwencji po języku -- mieszają się moduły z różnych języków w jednym łańcuchu odsłaniania.

### Rozwiązanie

Unlock_order będzie działać **per język**. Ten sam numer (np. 1) może istnieć w module polskim i niemieckim -- to dwie niezależne sekwencje. Blokowanie dotyczy TYLKO modułów w języku `training_language` użytkownika. Moduły z innych języków (przeglądane przez katalog) nie mają blokady.

### Zmiany

#### 1. Baza danych -- BEZ ZMIAN
Kolumna `unlock_order` już istnieje. Numery są unikalne w ramach danego `language_code` (pilnowane na froncie, bez constraintu DB). Nie trzeba migracji.

#### 2. Training.tsx -- logika blokowania per język

Zmiana w `modulesWithLockState`:
- Filtrować moduły z `unlock_order != null` **tylko dla `trainingLanguage`** użytkownika.
- Budować łańcuch odsłaniania wyłącznie z modułów o `language_code === trainingLanguage`.
- Moduły z **innego** języka niż `trainingLanguage`: nigdy nie są blokowane (`isLocked = false`), bo są "do wglądu".

```text
sequentialModules = modules
  .filter(m => m.unlock_order != null && m.language_code === trainingLanguage)
  .sort(by unlock_order)

// ... budowanie unlockedIds jak dotychczas ...

// Wynik:
// moduł z language_code !== trainingLanguage -> isLocked = false (zawsze dostępny do wglądu)
// moduł z language_code === trainingLanguage i unlock_order != null i NIE w unlockedIds -> isLocked = true
// reszta -> isLocked = false
```

#### 3. TrainingModule.tsx -- guard per język

W sprawdzeniu blokady przy wejściu do `/training/:moduleId`:
- Filtrować `allSeqModules` po `language_code` modułu docelowego (już częściowo zrobione).
- Dodać warunek: jeśli `language_code` modułu !== `training_language` użytkownika, to moduł NIE jest blokowany (jest "do wglądu").

#### 4. TrainingManagement.tsx -- admin widzi podział na języki

**Tabela modułów** -- w kolumnie "Odsłanianie" zamiast statycznego tekstu, dropdown `Select` z:
- Opcja "---" (null = brak sekwencji, moduł zawsze dostępny).
- Cyfry 1..N, gdzie N = liczba modułów **w tym samym języku**.
- Ukryte są numery już zajęte przez **inne moduły w tym samym języku** (nie globalne).
- Zmiana wartości natychmiastowo zapisuje do DB i odświeża listę.

**Logika `usedUnlockOrders`** -- grupowana per `language_code`:
```text
// Dla modułu o language_code = 'pl':
usedByLanguage = modules
  .filter(m => m.language_code === module.language_code && m.id !== module.id && m.unlock_order != null)
  .map(m => m.unlock_order)

availableOptions = [1..N].filter(n => !usedByLanguage.includes(n))
```

**Funkcja `updateUnlockOrder(moduleId, newValue)`:**
- `supabase.from('training_modules').update({ unlock_order: newValue }).eq('id', moduleId)`
- Po sukcesie: `fetchModules()` + toast.

### Szczegoly techniczne

**Pliki do modyfikacji:**

1. **`src/pages/Training.tsx`** (linie ~88-117) -- dodanie filtrowania `language_code === trainingLanguage` w logice `modulesWithLockState`. Moduły spoza `trainingLanguage` dostają `isLocked = false`.

2. **`src/pages/TrainingModule.tsx`** (linie ~229-270) -- dodanie warunku: jeśli moduł jest w innym języku niż `training_language` profilu, pominąć blokadę.

3. **`src/components/admin/TrainingManagement.tsx`** (linie ~1405-1407) -- zamiana statycznego tekstu na komponent `Select` z dynamiczną listą dostępnych numerów per język. Dodanie funkcji `updateUnlockOrder`.

**Bez zmian:** baza danych, typy, migracje.
