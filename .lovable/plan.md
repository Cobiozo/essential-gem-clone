

# Aktywność na żywo w pasku informacyjnym (News Ticker)

## Opis funkcji

Dodanie nowego źródła danych do paska informacyjnego — **aktywność użytkowników w czasie rzeczywistym**. Admin wybiera z listy checkboxów, które typy aktywności mają się pojawiać. Każdy element wyświetla się z datą/godziną i opisem, np.:

- "22:50 22.03.2026 — Witamy Jana K., nowego użytkownika Pure Life Center!"
- "22:45 22.03.2026 — Jan K. ukończył moduł „Szybki Start" i wygenerował certyfikat. GRATULUJEMY!"
- "22:30 22.03.2026 — Anna M. zarejestrowała się na webinar „Omega-3 w praktyce""
- "22:15 22.03.2026 — Piotr W. ukończył lekcję w module „Podstawy zdrowia""
- "21:50 22.03.2026 — Nowy partner dołączył do zespołu: Maria S."

## Typy aktywności do wyboru przez admina

| Typ | Ikona | Opis |
|-----|-------|------|
| `new_user_welcome` | UserPlus | Nowy użytkownik zarejestrował się |
| `training_module_complete` | GraduationCap | Ukończenie modułu szkoleniowego |
| `certificate_generated` | Award | Wygenerowanie certyfikatu |
| `event_registration` | CalendarCheck | Rejestracja na wydarzenie |
| `training_lesson_complete` | BookOpen | Ukończenie lekcji |
| `new_partner_joined` | Handshake | Nowy partner dołączył |
| `profile_update` | UserCog | Aktualizacja profilu |
| `file_upload` | Upload | Przesłanie pliku |

## Zmiany

### 1. Migracja bazy danych

**Tabela `news_ticker_settings`** — dodanie kolumn:
- `source_live_activity` (boolean, default false) — master switch
- `live_activity_types` (jsonb, default '[]') — lista wybranych typów aktywności
- `live_activity_max_items` (integer, default 5) — max elementów z aktywności
- `live_activity_hours` (integer, default 24) — z ilu ostatnich godzin pobierać

### 2. `useNewsTickerData.ts` — pobieranie aktywności

Gdy `settings.sourceLiveActivity` jest włączone:
- Pobierz ostatnie wpisy z `user_activity_log` (filtr po wybranych typach + limit czasu)
- JOIN z `profiles` żeby mieć imię użytkownika
- Dla `training_module_complete` — odczytaj `action_data.module_title`
- Dla rejestracji na wydarzenie — odczytaj `action_data.event_title`
- Sformatuj każdy wpis z datą/godziną + treścią po polsku
- Nowe rejestracje użytkowników: pobierz z `profiles` (created_at w ostatnich X godzinach)

### 3. `NewsTickerManagement.tsx` — panel admina

W sekcji "Źródła danych" dodać:
- Checkbox "Aktywność użytkowników na żywo" (master switch)
- Po zaznaczeniu: lista checkboxów z typami aktywności
- Slider: "Pokaż z ostatnich X godzin" (1-72h)
- Slider: "Maks. elementów aktywności" (1-20)

### 4. `types.ts` — rozszerzenie typów

- Dodanie `'activity'` do unii `type` w `TickerItem`
- Dodanie pól `sourceLiveActivity`, `liveActivityTypes`, `liveActivityMaxItems`, `liveActivityHours` do `TickerSettings`

| Plik | Zmiana |
|------|--------|
| Migracja SQL | 4 nowe kolumny w `news_ticker_settings` |
| `src/components/news-ticker/types.ts` | Nowy typ `activity`, pola settings |
| `src/components/news-ticker/useNewsTickerData.ts` | Pobieranie i formatowanie aktywności |
| `src/components/admin/NewsTickerManagement.tsx` | UI checkboxów typów aktywności |

