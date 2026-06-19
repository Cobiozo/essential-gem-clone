## Co znalazłem (diagnoza)

1. **Punkty w nagłówku (10) ≠ suma zaliczonych (15)** — w bazie `total_points=10`, a suma `points_awarded` zaliczonych zadań = 15. CRON aktualizuje `total_points` **tylko** gdy zmienia się `current_day` albo w trybie `daily`. W trybie `hourly` (i po kliknięciu „Sprawdź postęp") nigdy nie przelicza sumy. → bug.

2. **„Uzupełnij profil do 100%" nigdy nie zalicza** — funkcja SQL `challenge_count_action` dla klucza `profile_completion_100` szuka profilu po `WHERE id = v_user`, a w tabeli `profiles` użytkownik ma `user_id = <auth_id>` a `id` to inny UUID. Czyli SELECT zawsze zwraca 0. Sprawdziłem na żywej bazie — Twój profil jest 100% kompletny, ale RPC nie znajduje rekordu. → bug do naprawy w migracji SQL.

3. **CRON co godzinę** — aktualny harmonogram `0 * * * *` (godzinowy) + `0 5 * * *` (dzienny). Zbyt rzadko jak na odczucia użytkownika.

4. **UI** — brak komunikatu „weryfikacja w toku" oraz brak licznika czasu przy poprzednich dniach (tylko dla bieżącego).

---

## Plan naprawy

### 1. Naprawa funkcji SQL (migracja)
W `challenge_count_action` dla klucza `profile_completion_100` zmienić `WHERE id = v_user` na `WHERE user_id = v_user`.

### 2. CRON co 15 minut (rekomendacja)
- Zmienić harmonogram `challenge-supervisor-hourly` z `0 * * * *` na `*/15 * * * *` (co 15 min).
- Dzienny przelicznik dnia/serii (`0 5 * * *`) zostaje bez zmian.
- Dlaczego 15 min: kompromis między „szybką gratyfikacją" a kosztem wywołań Edge Function dla wszystkich uczestników. Krócej (np. 5 min) generuje 12× więcej zapytań RPC bez realnej korzyści — większość zadań i tak wymaga akcji użytkownika, więc 15 min jest wyczuwalne, a nie obciąża bazy.

### 3. Edge function `challenge-daily-supervisor`
- Przelicz `total_points`, `current_streak`, `longest_streak` **przy każdym uruchomieniu** (nie tylko gdy zmienił się dzień ani tylko w daily). To naprawia rozjazd 10 vs 15.
- Bez innych zmian logiki.

### 4. UI — komunikat „weryfikacja w toku"
W `TaskCard.tsx`:
- Po kliknięciu CTA dla zadań, które wymagają weryfikacji CRON (video, lesson, resource, page, CRM, DM, share, profile 100%) — zamiast pojedynczego toastu zapisać w stanie lokalnym znacznik „pending verification" (np. timestamp w `localStorage` per task_id).
- Gdy zadanie nie jest jeszcze `isCompleted`, a w stanie jest pending — pokazać badge:
  > „🕒 Weryfikacja w toku — sprawdzamy zaliczenie automatycznie co 15 minut. Możesz spokojnie kontynuować."
- Dla zadań typu `self_confirm` — bez zmian (zaliczają się natychmiast).
- Przycisk „Sprawdź postęp" — dodać krótką notkę pod paskiem: „Pełna automatyczna weryfikacja co 15 min."

### 5. Countdown dla poprzednich dni
W `DayCountdown.tsx` i `DayTasksList.tsx`:
- Rozszerzyć `DayCountdown` o tryb dla starszych dni: deadline = dzień startu danego dnia + 1 doba do 22:00 Europe/Warsaw (czyli ten sam wzór, ale liczony względem daty dnia, nie „dzisiaj").
- Przekazywać do `DayCountdown` opcjonalnie `dayDate` (data, kiedy zaczął się dany dzień challenge'u dla uczestnika); domyślnie = dzisiaj.
- W zakładce „Wcześniejsze" przy nagłówku „Dzień 1", „Dzień 2"… renderować mały badge:
  - jeśli `deadline > now` → „Pozostało X na zaliczenie Dnia N" (rzadki przypadek)
  - jeśli `deadline ≤ now` → „Czas minął — Dzień N zamknięty" (czerwony badge)
- Dla bieżącego dnia (zakładka „Dziś") — bez zmian.

### Pliki do zmiany
- `supabase/migrations/<nowa>.sql` — fix `challenge_count_action` (profile_completion_100 → user_id).
- `supabase/migrations/<nowa>.sql` — `cron.unschedule('challenge-supervisor-hourly')` + nowy `cron.schedule(..., '*/15 * * * *', ...)`.
- `supabase/functions/challenge-daily-supervisor/index.ts` — przelicz `total_points` zawsze.
- `src/components/challenge/TaskCard.tsx` — badge „weryfikacja w toku" + persist pending state.
- `src/components/challenge/DayCountdown.tsx` — parametr `dayDate`.
- `src/components/challenge/DayTasksList.tsx` — countdown przy każdym dniu w „Wcześniejsze" + notka pod „Sprawdź postęp".

### Efekt końcowy
- Po wdrożeniu i jednym ręcznym kliknięciu „Sprawdź postęp" — profil 100% zostanie zaliczony, `total_points` zaktualizuje się do 25 (10+5+10), a w nagłówku zobaczysz prawidłową sumę.
- Następne weryfikacje będą automatyczne co 15 min.
- Użytkownik zawsze widzi „weryfikacja w toku" zamiast pustki.
- Każdy dzień (również wcześniejszy) ma swój zegar / status „zamknięty".
