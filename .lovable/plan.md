## Diagnoza

**1) Brak danych uczestnika ("—" + UUID).**
`ParticipantsTable.tsx` i `ChallengeStats.tsx` łączą uczestnika z profilem po `profiles.id`, a powinno być po `profiles.user_id`. W tym projekcie `profiles.id` i `profiles.user_id` to różne kolumny — stąd "—". Ten sam błąd ma stara wersja `AccessManager` (już naprawiona dziś).

**2) Streak „0 / 0" — co to znaczy.**
W tabeli widać dwie liczby: **aktualny streak / najdłuższy streak**. Logika z edge function `challenge-daily-supervisor`:
- liczy się **od bieżącego dnia wstecz**, ile pod rząd dni miało **wszystkie zadania oznaczone jako „wymagane do przejścia dalej"** (`required_to_advance`) zaliczone (`verification_status = 'verified'`),
- pierwszy dzień bez kompletu wymaganych zadań przerywa serię,
- dni bez zadań wymaganych są **pomijane** (nie zerują serii),
- `longest_streak = MAX(aktualny streak, dotychczasowy longest)`.
„0 / 0" = uczestnik nigdy jeszcze nie zaliczył w 100% zadań wymaganych ani jednego dnia (albo żadne zadanie w jego dniach nie jest oznaczone jako wymagane).

**3) Skąd Józef Pyza ma dostęp.**
W bazie są dwa wpisy w `challenge_user_access` z datą sprzed dzisiejszej migracji:
- `user_id = 418aa822…` (Józef Pyza), `granted_by = 418aa822…` — Józef sam sobie nadał dostęp ze starej wersji panelu (gdy nie było jeszcze ograniczeń: walidacji certyfikatu, audytu „kto nadał").
- `user_id = f16d13a1…` — **to nie jest user_id**, to `profiles.id` Sebastiana — wpis powstał przez błąd starej UI, dla której `grant(p.id)` wstawiał `profiles.id` do `challenge_user_access.user_id`. Rekord jest sierotą (nie pasuje do żadnego usera w auth).

Obie pozycje istniały **przed dzisiejszą zmianą**. Nowy flow (lider z certyfikatem / admin) działa poprawnie, ale stare rekordy zostały.

---

## Plan zmian

### 1. Naprawa danych uczestnika
**`src/components/challenge/admin/ParticipantsTable.tsx`**
- Zamiana lookup na `profiles.user_id`; pobierać `first_name, last_name, email, eq_id`.
- Kolumna „Uczestnik": pełne imię i nazwisko + EQ ID pod spodem, e-mail w drugim wierszu.
- Tooltip nad nagłówkiem „Streak": „Aktualna seria pod rząd / najdłuższa".

**`src/components/challenge/admin/ChallengeStats.tsx`**
- Ta sama poprawka joina (`user_id` zamiast `id`).

**`src/components/challenge/admin/PeerPairsTab.tsx`**
- Wyświetlać `first_name + last_name` zamiast `full_name`.

### 2. Czyszczenie sierot w `challenge_user_access`
Migracja: usuń rekordy, których `user_id` nie istnieje w `profiles.user_id` (orphany typu „f16d13a1"). Wpis Józefa **zostaje** (jest realnym userem), ale w UI widać teraz jasno „Nadane przez: Administrator" + datę — jeśli nie ma być widoczny, admin może go usunąć ikoną kosza.

Opcjonalnie: dla wpisów, gdzie `granted_by = user_id` i `granted_by_role = 'admin'`, dopisać oznaczenie „self" (kosmetyka — chyba że uznasz, że takie rekordy też mają być automatycznie wyczyszczone; pytanie poniżej).

### 3. Rozbudowane Statystyki (`ChallengeStats.tsx`)
Sekcje (kolejność od góry):

**A. KPI (8 kafli, grid 4×2)**
- Aktywni, Ukończyli, Porzucili, Średni dzień
- Średni streak, Liczba par, % ukończenia (ukończeni / wszyscy), Łączne punkty

**B. Podium — TOP 3** (`Trophy` złoto/srebro/brąz, imię + nazwisko, EQ ID, punkty, dzień, streak).

**C. TOP 10 ranking indywidualny** (lista, jak teraz, ale z imieniem + EQ ID).

**D. TOP 5 par** (`challenge_peer_pairs` × `challenge_participants`):
sortowanie po **sumie punktów obu uczestników**, kolumny: pozycja, „A & B", łączne punkty, średni dzień pary, średni streak.

**E. Wykres aktywności w czasie** (`recharts` AreaChart) — liczba zaliczonych zadań per dzień (group by `verified_at::date` z `challenge_task_completions` gdzie `verification_status='verified'`) ostatnie 30 dni.

**F. Rozkład uczestników po dniu** (`recharts` BarChart) — oś X: dzień 1…duration, oś Y: liczba uczestników na tym dniu.

**G. Kwalifikacja (procent ukończenia wymaganych zadań)** — 4 progi: ≥90%, ≥70%, ≥50%, <50% — pasek/bar z liczbą uczestników w każdym przedziale.

Komponenty `recharts` są już w projekcie, używać tokenów koloru z `index.css` (`hsl(var(--primary))` itp.).

### 4. Drobiazgi
- W `ParticipantsTable` pokazać kolumnę EQ ID.
- W „Streak" zmienić nagłówek na „Streak (akt./najd.)" + tooltip.

---

## Weryfikacja

1. Zakładka **Uczestnicy** — widać imię, nazwisko, EQ ID, e-mail Sebastiana (zamiast „—" + UUID).
2. Zakładka **Dostęp** — orphan „—" znika; Józef pozostaje (z opcją ręcznego usunięcia).
3. Zakładka **Statystyki** — widać Podium (1 osoba), TOP 10, TOP 5 par (na razie pusto, bo brak par), wykres aktywności i rozkład dni.
4. Tooltip nad „Streak" wyjaśnia zasadę.

## Pytanie do Ciebie

Czy wpis dostępu Józefa Pyzy ma zostać **usunięty automatycznie** w migracji razem z sierotą, czy mam zostawić go w tabeli (z możliwością ręcznego skasowania ikoną kosza w nowej UI)?
