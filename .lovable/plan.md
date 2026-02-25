

## System sekwencyjnego odsłaniania modułów szkoleniowych

### Opis funkcjonalności

Nowi użytkownicy (lub ci, którzy jeszcze nie rozpoczęli nauki) widzą moduły szkoleniowe odsłaniane jeden po drugim. Administrator ustala kolejność odsłaniania. Pierwszy moduł w kolejce jest od razu dostępny (kolorowy, klikalny). Pozostałe są wyszarzone i nieklikalne. Po ukończeniu aktualnego modułu (100%) i powrocie do Akademii, kolejny moduł staje się dostępny.

### Zmiany w bazie danych

**Nowa kolumna w tabeli `training_modules`:**
- `unlock_order` (integer, nullable, default null) -- kolejność odsłaniania ustawiana przez administratora. Moduły z `unlock_order` uczestniczą w systemie sekwencyjnym. Null = moduł nie uczestniczy w sekwencji (zawsze dostępny, zachowanie jak dotychczas).

Migracja SQL:
```text
ALTER TABLE training_modules ADD COLUMN unlock_order integer DEFAULT NULL;
```

### Logika odsłaniania (frontend -- Training.tsx)

1. Po pobraniu modułów z postępem, posortować te z `unlock_order != null` wg `unlock_order`.
2. Dla każdego modułu z `unlock_order` sprawdzić:
   - Pierwszy w kolejności (`unlock_order` najniższy) -- ZAWSZE odblokowany.
   - Kolejny moduł jest odblokowany TYLKO jeśli poprzedni ma `progress === 100` (lub posiada certyfikat).
   - Moduły bez `unlock_order` (null) -- zachowanie bez zmian, zawsze dostępne.
3. Dodać flagę `isLocked` do każdego modułu.

### Zmiany UI w Training.tsx (strona Akademii)

- Moduły z `isLocked = true`:
  - Karta ma obniżoną przezroczystość (`opacity-50`) i szary overlay.
  - Kursor `cursor-not-allowed`, brak `onClick` nawet na przycisku.
  - Badge "Zablokowany" zamiast "Nierozpoczęty".
  - Przycisk "Rozpocznij szkolenie" jest wyszarzony (`disabled`).
  - Mała informacja pod przyciskiem: "Ukończ poprzednie szkolenie, aby odblokować".
- Moduły z `isLocked = false` -- bez zmian, pełna interakcja.

### Ochrona dostępu do modułu (TrainingModule.tsx)

- Przy wejściu do `/training/:moduleId` sprawdzić czy moduł jest zablokowany (pobrać `unlock_order` modułu, sprawdzić czy poprzedni moduł w sekwencji ma 100% postępu).
- Jeśli zablokowany -- przekierować do `/training` z toastem "Najpierw ukończ poprzednie szkolenie".

### Panel administracyjny (TrainingManagement.tsx)

- W formularzu edycji modułu dodać pole "Kolejność odsłaniania" (number input, opcjonalne).
  - Puste = moduł zawsze dostępny (jak dotychczas).
  - Wartość liczbowa = pozycja w sekwencji odsłaniania (1, 2, 3...).
- W tabeli modułów wyświetlić kolumnę "Odsłanianie" z wartością `unlock_order` lub "---" (brak sekwencji).

### Szczegóły techniczne

**Pliki do modyfikacji:**
1. **Migracja SQL** -- dodanie kolumny `unlock_order` do `training_modules`.
2. **`src/pages/Training.tsx`** -- logika obliczania `isLocked` dla każdego modułu + UI wyszarzenia zablokowanych kart.
3. **`src/pages/TrainingModule.tsx`** -- guard sprawdzający czy moduł jest odblokowany przed załadowaniem treści.
4. **`src/components/admin/TrainingManagement.tsx`** -- pole `unlock_order` w formularzu modułu + wyświetlanie w tabeli.
5. **`src/types/training.ts`** -- dodanie `unlock_order?: number | null` do interfejsu `TrainingModule`.
6. **`src/components/dashboard/widgets/TrainingProgressWidget.tsx`** -- uwzględnienie `isLocked` (opcjonalnie, aby widget też pokazywał tylko odblokowane moduły).

**Algorytm odsłaniania (pseudokod):**
```text
sequentialModules = modules.filter(m => m.unlock_order != null).sort(by unlock_order)
unlockedIds = new Set()

for each module in sequentialModules:
  if this is the first module:
    unlockedIds.add(module.id)
  else if previous module has progress === 100:
    unlockedIds.add(module.id)
  else:
    break  // kolejne moduły też zablokowane

// Moduły bez unlock_order: zawsze odblokowane
// Moduły z unlock_order ale w unlockedIds: odblokowane
// Moduły z unlock_order ale NIE w unlockedIds: zablokowane (isLocked = true)
```

**Kompatybilność wsteczna:**
- Domyślnie `unlock_order = null` -- wszystkie istniejące moduły zachowują dotychczasowe zachowanie (zawsze dostępne).
- Administrator włącza sekwencyjne odsłanianie ustawiając `unlock_order` na wybranych modułach.
- System działa per język (filtrowanie modułów po `language_code` przed obliczeniem sekwencji).

