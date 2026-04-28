## Cel

Rozdzielić w Bazie testów Omega dwie zupełnie różne kategorie danych i umożliwić zarządzanie wieloma numerami ID testu Vitas dla jednego klienta:

1. **Numery ID testu laboratoryjnego (Vitas Oslo)** — może być **wiele** dla jednego klienta (każdy kolejny test wykonany w laboratorium dostaje swój nowy numer). Każdy dodawany **wynik klienta** można powiązać z konkretnym numerem ID testu.
2. **Wysyłka testu** — numer listu przewozowego + przewoźnik (transport zestawu/próbki). Pozostaje pojedynczy zestaw pól na kliencie (logistyka kuriera nie ma związku z laboratorium).

## Model danych

### Nowa tabela: `omega_test_lab_numbers`
Lista numerów ID testu Vitas powiązanych z klientem.

| kolumna | typ | uwagi |
|---|---|---|
| `id` | uuid PK | gen_random_uuid() |
| `client_id` | uuid FK → omega_test_clients(id) ON DELETE CASCADE | nie null |
| `user_id` | uuid | właściciel (partner) — do RLS |
| `lab_number` | text | nie null, np. „VIT-2026-12345" |
| `lab_name` | text | domyślnie „Vitas Oslo" |
| `issued_date` | date | opcjonalnie — data wydania/otrzymania numeru |
| `notes` | text | opcjonalnie |
| `created_at` / `updated_at` | timestamptz | |

UNIQUE `(client_id, lab_number)` — nie da się dodać tego samego numeru dwa razy temu samemu klientowi.

**RLS:** identyczna jak w `omega_test_clients` — dostęp tylko właściciela (`user_id = auth.uid()`) + admin.

### Modyfikacja istniejącej tabeli: `omega_tests`
Dodajemy:
- `lab_number_id uuid NULL REFERENCES omega_test_lab_numbers(id) ON DELETE SET NULL`

Powiązanie wyniku testu z konkretnym numerem ID. Pole opcjonalne (stare wyniki bez numeru pozostają poprawne).

### Stare pole na kliencie
Pole `omega_test_clients.test_number` zostaje **w bazie** (wsteczna kompatybilność dla istniejących rekordów), ale w UI jest **usuwane z formularza klienta**. Po wdrożeniu w UI używamy wyłącznie nowej tabeli `omega_test_lab_numbers`. (Migrację treści ze starego pola do nowej tabeli wykonamy automatycznie w migracji SQL — dla każdego klienta z niepustym `test_number` utworzymy jeden wpis w `omega_test_lab_numbers`.)

## Zmiany w UI

### 1. `src/components/omega-tests/ClientFormDialog.tsx`
- Usuwamy z formularza pole „Numer testu" (przeniesione do osobnej sekcji w drawerze klienta).
- Sekcja „Wysyłka testu (opcjonalnie)" zostaje, ale zawiera już TYLKO `tracking_number` + `carrier`. Ikona `Truck`, opis: „Dane kuriera dla wysyłki zestawu testowego do/z laboratorium".

### 2. `src/components/omega-tests/ClientDetailDrawer.tsx`
W nagłówku drawera dodajemy/zmieniamy:
- Usuwamy stary chip „Test: …" (był z pojedynczego pola).
- Pozostawiamy chipy „List: …" + przewoźnik.

Dodajemy **nową zakładkę** lub **panel sekcji** w zakładce „Testy i wyniki":

**Sekcja „Numery ID testu — Vitas Oslo"** (nad formularzem dodawania wyniku):
- Lista wszystkich numerów ID testu klienta (karty/wiersze).
- Każdy wiersz: ikona `FlaskConical`, numer, opcjonalna data wydania, liczba przypisanych wyników, przyciski Edytuj / Usuń.
- Przycisk „+ Dodaj numer ID testu" → mały dialog z polami `Numer ID testu` (wymagany), `Data wydania` (opcjonalnie), `Notatka` (opcjonalnie). Stała etykieta laboratorium: „Vitas Oslo".
- Krótki opis sekcji: *„Identyfikatory badań nadane przez laboratorium Vitas w Oslo, w którym wykonywane są wszystkie testy Omega. Możesz dodać wiele numerów — przy zapisie wyniku wybierzesz, którego dotyczy."*

### 3. `src/components/omega-tests/ClientTestForm.tsx` (formularz dodawania wyniku klienta)
Dodajemy **nowe pole na samej górze** formularza:
- `Select` „Numer ID testu (Vitas Oslo)" z opcjami z `omega_test_lab_numbers` dla bieżącego klienta + opcja „— bez przypisania —" + opcja „➕ Dodaj nowy numer ID testu…" (otwiera ten sam dialog co w sekcji wyżej, po zapisaniu auto-wybiera nowy numer).
- Wybrana wartość → `lab_number_id` w `OmegaTestInput`.
- Jeśli klient nie ma jeszcze żadnego numeru, pokazujemy delikatny komunikat zachęcający do dodania (ale pole pozostaje opcjonalne).

### 4. `src/components/omega-tests/OmegaTestHistory.tsx`
Każdy wiersz historii wyniku klienta dostaje dodatkowy badge: ikona `FlaskConical` + numer ID testu (jeśli przypisany). W trybie edycji wyniku można zmienić przypisanie do innego numeru lub odpiąć.

## Nowy hook: `src/hooks/useOmegaTestLabNumbers.ts`
- `useOmegaTestLabNumbers(clientId)` — lista numerów dla klienta + statystyka „ile wyników jest do tego numeru przypisanych".
- Mutacje: `addLabNumber`, `updateLabNumber`, `deleteLabNumber`.
- React Query, invalidacja kluczy `['omega-tests', …]` po zmianach (bo statystyka zależy od wyników).

## Zmiany w istniejących hookach
- `useOmegaTests`: rozszerzyć `OmegaTest` i `OmegaTestInput` o `lab_number_id?: string | null`.
- `useOmegaTestClients`: usunąć z formularza obsługę `test_number` (pole zostaje w typie tylko jako legacy/optional, nie wystawiamy w UI).

## Migracja SQL
Jedna migracja:
1. `CREATE TABLE public.omega_test_lab_numbers (…)` + indeksy + UNIQUE.
2. `ALTER TABLE omega_tests ADD COLUMN lab_number_id uuid NULL REFERENCES omega_test_lab_numbers(id) ON DELETE SET NULL`.
3. RLS + policies (select/insert/update/delete dla `auth.uid() = user_id`, plus admin via `has_role`).
4. Trigger `updated_at` (standard pattern z innych tabel).
5. Backfill: dla każdego rekordu w `omega_test_clients` z niepustym `test_number` utworzyć wpis w `omega_test_lab_numbers` (lab_name = 'Vitas Oslo'). Następnie dla każdego `omega_tests.client_id` przypisać `lab_number_id` do tego nowo utworzonego wpisu (jeden klient → jeden zachowany numer).

## Bez zmian
- Logika przypomnień +25d / +120d.
- Schemat pól wyników (omega3_index, omega6_3_ratio itp.).
- Lista przewoźników `src/lib/carriers.ts`.

## Rezultat
- Numer ID testu Vitas to osobna, jasno opisana kategoria laboratoryjna (nie myli się z kurierem).
- Klient może mieć wiele numerów (kolejne badania w czasie).
- Każdy zapisany wynik można powiązać z konkretnym numerem → pełna identyfikowalność „który wynik z którego badania w Vitas".
