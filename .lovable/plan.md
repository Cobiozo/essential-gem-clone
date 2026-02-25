
## Poprawki i ulepszenia panelu administracyjnego szkolen

### 1. Naprawa kolumny "Lekcje" (wartosci "0")

**Problem:** Stan `lessons` przechowuje tylko lekcje dla aktualnie wybranego modulu (z zakladki "Lekcje"). Na zakladce "Moduly" filtrowanie `lessons.filter(l => l.module_id === module.id)` daje 0 dla kazdego modulu, bo lessons dotyczy innego kontekstu.

**Rozwiazanie:** Dodac osobny stan `allLessonCounts` -- mape `module_id -> liczba lekcji` -- pobierana jednorazowo razem z modulami. Osobne zapytanie:
```text
SELECT module_id, count(*) FROM training_lessons GROUP BY module_id
```
Lub pobranie wszystkich lekcji (tylko id i module_id) i zliczenie na froncie. Uzyc tego w kolumnie "Lekcje" zamiast filtrowania po `lessons`.

### 2. Szybkie przelaczanie statusu (aktywny/nieaktywny) w tabeli

Zamiana statycznego tekstu statusu na klikalny przycisk/switch. Po kliknieciu natychmiastowy UPDATE `is_active` w bazie i odswiezenie listy.

**Implementacja:** W kolumnie "Status" (linie 1498-1511) zamiast tekstu, uzyc komponentu `Switch` lub klikalnego `Badge` z `onClick`. Wywolanie:
```text
supabase.from('training_modules').update({ is_active: !module.is_active }).eq('id', module.id)
```

### 3. Szybkie wybieranie widocznosci w tabeli

Zamiana tekstu "partnerzy, specjalisci" na multi-select dropdown lub zestaw checkboxow w popoverze. Po zmianie -- natychmiastowy zapis do bazy.

**Implementacja:** W kolumnie "Widoczny dla" (linie 1512-1514) dodac `DropdownMenu` z checkboxami dla kazdej roli (wszyscy, klienci, partnerzy, specjalisci, anonimowi). Kazdy checkbox wywoluje UPDATE odpowiedniego pola `visible_to_*`.

### 4. Sortowanie i filtrowanie w zakladce "Postepy uzytkownikow"

Dodac pasek filtrów/sortowania nad lista uzytkownikow (przed searchbarem lub obok). Nowy stan `progressSortBy` z opcjami:

- **Wg procentu ukonczenia** (domyslnie) -- sortowanie malejaco po `overallProgress`
- **Wg nazwy** (alfabetycznie A-Z)
- **Wg jezyka szkolenia** -- grupowanie po `training_language`
- **Wg daty dolaczenia** -- sortowanie po najwczesniejszym `assigned_at` z modulow uzytkownika
- **Wg ostatniej aktywnosci** -- wymaga dodatkowego pola; mozna uzyc `assigned_at` jako przyblizonego wskaznika lub pobrania `max(updated_at)` z training_progress

Dodac rowniez filtr jezyka (Select: Wszystkie / PL / EN / DE / ...) analogiczny do zakladki Moduly.

**Implementacja:** 
- Nowe stany: `progressSortBy`, `progressLanguageFilter`
- `useMemo` generujacy `sortedFilteredUserProgress` z `filteredUserProgress`
- Pasek filtrów UI: dwa Select obok searchbara

### Zmiany techniczne

**Plik: `src/components/admin/TrainingManagement.tsx`**

1. **Nowy stan `allLessonCounts`** (Map/Record) -- pobierany w `fetchModules` lub osobnym useEffect. Zapytanie: `supabase.from('training_lessons').select('module_id')` i zliczenie.

2. **Zamiana `lessonCount`** w renderowaniu tabeli modulow -- uzyc `allLessonCounts[module.id] || 0` zamiast `lessons.filter(...)`.

3. **Funkcja `updateModuleField(moduleId, field, value)`** -- generyczna do aktualizacji pojedynczego pola modulu. Uzyc jej zarowno dla statusu jak i widocznosci.

4. **Kolumna "Status"** -- zamiana na klikalny element (Switch lub Badge z kursorem pointer).

5. **Kolumna "Widoczny dla"** -- zamiana na DropdownMenu z checkboxami ról.

6. **Pasek filtrów "Postepy"** -- dwa Select nad lista uzytkownikow + logika sortowania w useMemo.

7. **Identyczne zmiany w widoku mobilnym** (Card layout) dla statusu i widocznosci.
