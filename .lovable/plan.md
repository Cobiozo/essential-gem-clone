## Cel

Zlikwidować JSON-y w formularzu zadań. Admin wybiera zadanie z gotowych szablonów + wskazuje konkretny zasób z platformy klikając w listę (nie wpisując UUID). Użytkownik klika przycisk, który prowadzi go bezpośrednio do tego miejsca w aplikacji. CRON automatycznie zalicza, albo użytkownik sam potwierdza, jeżeli zadania nie da się zweryfikować automatem. Dodać zegar odliczający do 22:00 dnia następnego.

---

## 1. Nowy kreator zadań (TaskFormDialog) — zero JSON

Zamiast jednego pola „Typ + JSON" – wybór z gotowych kafelków-szablonów. Każdy szablon ma własne, proste pola formularza:

**Szablony do wyboru przez admina:**

| Szablon | Co wybiera admin | Jak CRON zalicza |
|---|---|---|
| 🎬 **Obejrzyj wideo z Bazy Wiedzy** | dropdown z listą wideo (z Bazy Wiedzy) + opcja: „liczy się klik" lub „wymagaj X sekund" (domyślnie = długość wideo) | klik (event) lub user_activity_log `video_progress` ≥ X s |
| 📚 **Ukończ lekcję w Akademii** | dropdown moduł → dropdown lekcja + opcja: „klik / pełne ukończenie" | event `training_lesson_opened` lub `training_lesson_completed` |
| 📄 **Odwiedź zasób PURE / PDF** | dropdown z listy zasobów | event `resource_view` |
| 🔗 **Wejdź na podstronę aplikacji** | dropdown ze znanymi ścieżkami (/dashboard, /crm, /akademia, …) | event `page_view` z matching path |
| 👥 **Dodaj N kontaktów do CRM** | tylko liczba N | count `team_contacts_added` |
| 💬 **Wyślij N nowych wiadomości DM** | tylko liczba N | count `new_dm_threads` |
| 📤 **Udostępnij wideo X osobom** | dropdown wideo + liczba odbiorców | count `share_send` per resource_id |
| ✅ **Uzupełnij profil do 100%** | nic | profile completion check |
| 📝 **Zadanie offline (samo-potwierdzenie)** | tylko tytuł + opis | przycisk „Potwierdzam wykonanie" w karcie zadania → wpis do `challenge_task_completions` jako `verified` natychmiast |

Pole „Punkty", „Aktywne", „Wymagane do streak" zostają. Pole „Tryb (Auto/Manual)" znika — wynika ze szablonu. Pole JSON znika całkowicie (zapis do `target_ref` dzieje się pod maską na podstawie wyborów admina).

**Edycja istniejącego zadania:** dialog odczytuje `task_type` + `target_ref` i wypełnia odpowiedni formularz szablonu. Jeśli stary rekord ma nieznane parametry — fallback do trybu „advanced" z surowym JSON-em (ukryty, tylko dla istniejących).

---

## 2. Karta zadania (TaskCard) — bezpośrednie przejście + samo-potwierdzenie

- 🎬 wideo z Bazy Wiedzy → przycisk „Oglądaj wideo" otwiera `/baza-wiedzy/odtwarzacz/<id>` z auto-play. Po `required_seconds` sekundach `useVideoProgress` loguje `video_progress` → CRON zalicza.
- 📚 lekcja Akademii → przycisk „Otwórz lekcję" prowadzi do `/akademia/lekcja/<id>` (lub równoważnego routu) z `trackActivity('training_lesson_opened')`.
- 📄 zasób → przycisk „Otwórz zasób" loguje `resource_view` i otwiera URL.
- 🔗 podstrona → przycisk „Przejdź" robi `navigate(path)` + log `page_view`.
- 👥/💬/📤 → przycisk „Przejdź do CRM/DM/Udostępnij" prowadzi w odpowiednie miejsce; licznik aktualizuje wskaźnik „X / N".
- ✅ profil 100% → przycisk „Uzupełnij profil" → `/profil`.
- 📝 zadanie offline → przycisk **„Potwierdzam wykonanie"** (z dialogiem potwierdzającym). Klik wstawia `challenge_task_completions` ze statusem `verified` i `verification_source='self'` — bez CRON-a.

---

## 3. Zegar odliczania (deadline 22:00 dnia następnego)

W nagłówku karty „Zadania" oraz przy banerze dnia: komponent `<DayCountdown />`.

- Logika: deadline = **jutro 22:00** w strefie `Europe/Warsaw` (przez `warsawLocalToUtc`).
- Format: „Pozostało: 1d 04:23:12 do zaliczenia Dnia 1".
- Tick co 1 s (cleanup on unmount).
- Po przekroczeniu: czerwony badge „Czas minął — Dzień zamknięty".

---

## 4. Backend (bez zmian schematu)

`challenge_tasks.target_ref` dalej JSONB — wypełniany przez kreator. Edge function `challenge-daily-supervisor` i RPC `challenge_count_action` już obsługują wszystkie checks z tabeli (po wcześniejszych fixach). Brak nowej migracji.

**Wyjątek — szablon „samo-potwierdzenie":** dodać do `verification_mode` ścieżkę `self_confirm`. Insert robi frontend (RLS już pozwala uczestnikowi pisać własne completions). CRON omija takie zadania.

---

## Pliki do zmiany

- `src/components/challenge/admin/TaskFormDialog.tsx` — przepisać na kreator z szablonami (selecty + pickery z bazy).
- `src/components/challenge/admin/pickers/` (nowe) — `VideoPicker`, `LessonPicker`, `ResourcePicker`, `RoutePicker` (każdy pobiera listę z Supabase i zwraca id + label).
- `src/components/challenge/TaskCard.tsx` — proper redirecty per typ + przycisk „Potwierdzam wykonanie" dla `self_confirm`.
- `src/components/challenge/DayCountdown.tsx` (nowy) — zegar do 22:00 next day.
- `src/pages/ChallengePage.tsx` — osadzić `<DayCountdown />`.
- `src/types/challenge.ts` — dodać `'self_confirm'` do `verification_mode`.

Brak migracji DB, brak zmian w edge function.
