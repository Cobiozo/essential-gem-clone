
# Naprawa: Lider nie widzi postępu szkoleń swojego zespołu

## Diagnoza — dwa oddzielne problemy

### Problem 1: Błąd "column reference user_id is ambiguous" w SQL

Funkcja `get_leader_team_training_progress` jest SECURITY DEFINER, ale RLS na tabelach `training_progress` i `training_assignments` używa warunku `auth.uid() = user_id` — kolumna `user_id` bez kwalifikatora tabeli. Gdy PostgreSQL kompiluje zapytanie w kontekście SECURITY DEFINER z wieloma JOIN-ami gdzie każda z tabel (`training_assignments`, `training_progress`) ma kolumnę `user_id`, parser rzuca `column reference "user_id" is ambiguous`.

Potwierdzone w logach PostgreSQL:
- `ERROR: column reference "user_id" is ambiguous` — 2 wystąpienia

### Problem 2: Błędny komunikat w UI — "Brak osób w strukturze"

Sebastian Snopek widoczny na screenie (eq_id: `12458557556`) ma `can_view_team_progress: false`. Funkcja rzuca wyjątek "Access denied" — ale `TeamTrainingProgressView.tsx` obsługuje to jako `rows = []` i wyświetla pusty stan "Brak osób w strukturze" zamiast komunikatu o braku uprawnień. To jest mylące.

Jednak na screenie widać, że zakładka "Szkolenia zespołu" JEST widoczna — co oznacza, że `can_view_team_progress` musi być `true` dla tego konkretnego sesji. Sprawdzenie bazy wykazało, że konto Sebastiana Snopka z `eq_id: 121118999` (które ma uprawnienie) jest właścicielem sesji — ale jego eq_id ma tylko 3 podwładnych, z których struktura poniżej może nie mieć przypisanych modułów.

Faktyczny błąd: funkcja SQL eksploduje na `column reference "user_id" is ambiguous` zanim w ogóle dotrze do wyników.

## Rozwiązanie

### Część 1: Naprawa SQL — nowa migracja z poprawioną funkcją

Problem ambiguous `user_id` wynika z tego, że PostgreSQL w kontekście SECURITY DEFINER, przy ewaluacji RLS policies na podtabelach, napotyka niejednoznaczność. Rozwiązanie: dodać `SET row_security = off` do funkcji (bezpieczne, bo funkcja ma własną weryfikację uprawnień przez sprawdzenie `leader_permissions`) LUB jawnie kwalifikować `user_id` w każdym JOIN.

Poprawka:
```sql
CREATE OR REPLACE FUNCTION public.get_leader_team_training_progress(p_leader_user_id uuid)
...
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off  -- <-- kluczowe: wyłącza RLS wewnątrz funkcji SECURITY DEFINER
```

Wyłączenie RLS w tej funkcji jest bezpieczne ponieważ:
- Funkcja ma własną weryfikację uprawnień (sprawdza `leader_permissions.can_view_team_progress`)
- Zwraca wyłącznie dane z hierarchii lidera (rekurencja przez `upline_eq_id`)
- Wzorzec `SET row_security = off` jest standardem dla funkcji SECURITY DEFINER w tym projekcie

### Część 2: Naprawa obsługi błędów w TeamTrainingProgressView.tsx

Aktualnie każdy błąd z Supabase (włącznie z "Access denied") jest obsługiwany tak samo — jako puste `rows = []`, co prowadzi do komunikatu "Brak osób w strukturze". Zamiast tego, należy:
- Jeśli błąd zawiera "Access denied" → wyświetlić komunikat o braku uprawnień
- Jeśli brak wyników → wyświetlić "Brak osób w strukturze"
- Inne błędy → toast z komunikatem technicznym

### Część 3: Włączenie uprawnień dla właściwego konta

Z danych wynika, że są dwa konta Sebastian Snopek:
- `eq_id: 12458557556` — widoczny na screenie, `can_view_team_progress: false`  
- `eq_id: 121118999` — ma uprawnienie, ale to inne konto

Administrator musi włączyć `can_view_team_progress` dla konta z `eq_id: 12458557556`. To wymaga działania admina w panelu — nie jest to zmiana kodu.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/[nowa].sql` | Nowa migracja: `CREATE OR REPLACE FUNCTION` z dodaniem `SET row_security = off` — naprawa błędu `user_id is ambiguous` |
| `src/components/training/TeamTrainingProgressView.tsx` | Lepsza obsługa błędów — rozróżnienie między "brak uprawnień", "brak danych" i "błąd techniczny" |

## Co musi zrobić administrator

Po wdrożeniu poprawki kodu, aby Sebastian Snopek (eq_id: `12458557556`) widział postęp swojego zespołu:
1. Wejść w **Panel Admin → Zdarzenia i rejestracje → Spotkania indywidualne**
2. Znaleźć "Sebastian Snopek" (eq_id: 12458557556)
3. Włączyć przełącznik w kolumnie "Szkolenia zespołu" (ikona GraduationCap)

Jego struktura w dół zawiera:
- Grzegorz Latocha (eq_id: 121213773)
- Katarzyna Snopek (eq_id: 121167843)
- oraz rekurencyjnie ich podwładni

## Efekt końcowy

Po naprawie funkcja SQL przestanie rzucać błąd `column reference "user_id" is ambiguous`, a lider zobaczy tabelę z postępem szkoleń każdej osoby w swojej strukturze organizacyjnej.
