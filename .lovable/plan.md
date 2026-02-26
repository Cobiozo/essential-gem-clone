
Cel: w dialogu kolizji zawsze pokazać:
1) kto prowadzi,
2) przedział czasu,
3) ilu uczestników z Twojego zespołu jest zapisanych — także gdy to 0.

Co potwierdziłem w kodzie i danych:
- `WebinarForm.tsx` i `TeamTrainingForm.tsx` już pobierają rozszerzone dane z RPC (`p_user_id` jest przekazywane).
- Problem jest w renderowaniu dialogu:
  - prowadzący jest pokazywany tylko warunkowo: `conflict.host_name && ...`
  - liczba osób z zespołu jest pokazywana tylko gdy `team_registered_count > 0`
- W bazie dla przykładowego konfliktu („Szkolenie Pure Calling”) RPC zwraca:
  - `host_name = NULL`
  - `team_registered_count = 0`
  czyli backend działa, ale UI ukrywa te informacje.
- Dodatkowo istnieją dwie przeciążone wersje `check_event_conflicts` (3-param i 4-param), co jest podatne na niejednoznaczności w przyszłości.

Plan wdrożenia:

1) Ujednolicenie i doprecyzowanie RPC `check_event_conflicts` (migracja SQL)
- Zostawić jedną docelową wersję funkcji (4 parametry z `p_user_id`) i usunąć starą 3-parametrową sygnaturę, żeby uniknąć niejednoznaczności.
- Uzupełnić `host_name` fallbackiem:
  - najpierw `events.host_name`,
  - jeśli puste/null, to imię+nazwisko z profilu `host_user_id`,
  - jeśli dalej brak, to profil `created_by`,
  - finalny fallback tekstowy: „Nie podano”.
- `team_registered_count` zawsze zwracać jako `COALESCE(..., 0)` (już jest, zostanie utrzymane).
- Zachować `SECURITY DEFINER` + `SET row_security = off` (zgodnie z obecną architekturą widoczności konfliktów).

2) Poprawa UI dialogu kolizji w `WebinarForm.tsx`
- Zmienić render tak, aby:
  - zawsze wyświetlać wiersz prowadzącego (`Prowadzący: ...`) — bez warunku ukrywającego,
  - zawsze wyświetlać wiersz o zespole (`0 uczestników z Twojego zespołu zapisanych`, `1 uczestnik...`, `2+ uczestników...`).
- Dodać bezpieczne mapowanie danych wejściowych z RPC (normalizacja):
  - `host_name ?? 'Nie podano'`
  - `Number(team_registered_count ?? 0)`

3) Poprawa UI dialogu kolizji w `TeamTrainingForm.tsx`
- Identyczne zmiany jak wyżej (ten sam wzorzec prezentacji i normalizacji), aby oba formularze zachowywały się spójnie.

4) Spójność tekstów i odmiany w języku polskim
- Ujednolicić komunikat na:
  - `0 uczestników z Twojego zespołu zapisanych`
  - `1 uczestnik z Twojego zespołu zapisany`
  - `2-4 uczestników z Twojego zespołu zapisanych`
  - `5+ uczestników z Twojego zespołu zapisanych`
- Dzięki temu użytkownik zawsze dostaje informację liczbową, nawet gdy wynik to zero.

5) Weryfikacja po wdrożeniu (E2E scenariusze)
- Scenariusz A: konflikt z wydarzeniem bez wpisanego hosta → dialog pokazuje „Prowadzący: Nie podano”.
- Scenariusz B: konflikt z wydarzeniem, gdzie host jest wpisany → dialog pokazuje konkretne imię/nazwisko.
- Scenariusz C: brak osób z zespołu zapisanych → dialog pokazuje „0 uczestników...”.
- Scenariusz D: są osoby z zespołu zapisane → poprawna liczba i odmiana.
- Scenariusz E: nadal możliwe „Zapisz mimo kolizji” (warning, nie twarda blokada) — bez zmiany obecnej polityki działania.

Zakres plików do zmiany:
- `supabase/migrations/...` (nowa migracja porządkująca i rozszerzająca `check_event_conflicts`)
- `src/components/admin/WebinarForm.tsx`
- `src/components/admin/TeamTrainingForm.tsx`

Efekt końcowy:
- Nie znikają już kluczowe informacje w dialogu kolizji.
- Widzisz prowadzącego (albo jasny fallback „Nie podano”).
- Zawsze widzisz liczbę osób z Twojego zespołu, także gdy jest 0.
