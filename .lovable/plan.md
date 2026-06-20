## Cel
Po wyszukaniu użytkownika (admin lub lider) w panelu Dostępu do Wyzwania 90-dniowego, od razu obok imienia ma być widoczny status ukończenia modułu „Szybki Start" w Akademii — zanim klikniemy „Nadaj dostęp".

## Zmiany

### 1. `src/components/challenge/admin/AccessManager.tsx` — wyniki wyszukiwarki (admin)
- W `useEffect` wyszukującym profile po wpisaniu zapytania: po pobraniu profili dorzucić zapytanie do `certificates` ograniczone do `module_id = ssModuleId` i `user_id in (...wyniki)`. Zbudować `Set<string>` z user_id mających certyfikat i dołączyć flagę `has_certificate` do każdego rekordu w `searchResults`.
- W renderze pojedynczego wyniku (`searchResults.map`) dodać badge obok imienia:
  - jeżeli ma cert → zielony `Tak (Szybki Start)` z ikoną `GraduationCap`,
  - jeżeli nie ma → pomarańczowy `Brak Szybki Start`.
- Jeśli `ssModuleId` jest `null` — pokazać neutralny badge „Nie skonfigurowano" (zamiast „Brak"), żeby admin wiedział, że to nie wina użytkownika.
- Status to tylko informacja — admin nadal może nadać dostęp (zachowujemy obecne zachowanie przycisku).

### 2. `src/components/leader/LeaderChallengeAccessView.tsx` — sekcja „Bez dostępu" (lider)
- Lista członków zespołu już pokazuje badge „Brak certyfikatu", więc na liście nic nie zmieniamy.
- Dodatkowo: gdy `searchQuery` zawęża widok do jednego/kilku użytkowników, upewnić się, że badge „Brak certyfikatu" / „Tak" jest spójny i widoczny też przy zwiniętym widoku mobilnym (drobny refactor klas, bez zmian logiki).

## Szczegóły techniczne
- Zapytanie certyfikatów: `supabase.from('certificates').select('user_id').eq('module_id', ssModuleId).in('user_id', ids)` — wykonywane równolegle z wynikami wyszukiwarki (gdy `ssModuleId` istnieje).
- Brak nowych RPC i migracji — `certificates` ma już politykę odczytu dla admina/lidera używaną w pozostałych miejscach modułu.
- Brak zmian w logice nadawania dostępu, ani w warunkach lidera.

## Pliki
- Edytowane: `src/components/challenge/admin/AccessManager.tsx`, `src/components/leader/LeaderChallengeAccessView.tsx`.