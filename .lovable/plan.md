

# Dwa systemy powiadomień o braku aktywności

## SYSTEM 1: Brak aktywności logowania (platformowa)

### Obecny stan
- `profiles.is_active` istnieje (boolean), ale **nigdzie nie jest sprawdzany** jako guard — użytkownik z `is_active=false` nadal ma pełny dostęp
- `profiles.last_seen_at` jest aktualizowany co 2 min przez `useLastSeenUpdater`
- `auth.users.last_sign_in_at` dostępny przez RPC `get_user_profiles_with_confirmation`
- **Brak mechanizmu ostrzegania ani blokowania** na podstawie braku aktywności

### Co trzeba zbudować

#### A. Migracja SQL
- Nowa tabela `inactivity_settings` (singleton): `warning_days` (14), `block_days` (30), `is_enabled` (true)
- Nowa kolumna `profiles.blocked_at` (timestamp, nullable) — data zablokowania
- Nowa kolumna `profiles.block_reason` (text, nullable) — powód blokady
- Nowa kolumna `profiles.inactivity_warning_sent_at` (timestamp, nullable) — kiedy wysłano ostrzeżenie
- RPC `get_inactive_users_for_warning()` — zwraca użytkowników z `last_seen_at` starszym niż 14 dni, których jeszcze nie ostrzegano (lub ostrzeżono dawniej niż 14 dni temu)
- RPC `get_inactive_users_for_blocking()` — zwraca użytkowników z `last_seen_at` starszym niż 30 dni, którzy nie są jeszcze zablokowani

#### B. Edge Function `send-inactivity-warning`
- Pobiera profil użytkownika, SMTP settings, szablon email
- Treść: informacja o 30-dniowym limicie, kontakt support@purelife.info.pl lub opiekun
- Aktualizuje `inactivity_warning_sent_at`

#### C. Logika blokowania w `process-pending-notifications`
- Nowy krok (Step N): wywołanie `get_inactive_users_for_warning()` → wysyłka ostrzeżeń
- Nowy krok (Step N+1): wywołanie `get_inactive_users_for_blocking()` → ustawienie `is_active=false`, `blocked_at=now()`, `block_reason='inactivity_30_days'`

#### D. Guard w AuthContext
- Po załadowaniu profilu: jeśli `is_active === false` → wyświetlić ekran blokady z informacją o kontakcie support@purelife.info.pl lub formularzu kontaktowym
- Użytkownik nadal jest zalogowany (sesja aktywna), ale widzi tylko komunikat blokady

#### E. Panel admina — odblokowanie
- W widoku użytkownika (CompactUserCard/UserEditDialog): przycisk "Odblokuj" gdy `is_active=false`
- Odblokowanie: `is_active=true`, `blocked_at=null`, `block_reason=null`, `last_seen_at=now()`

---

## SYSTEM 2: Brak aktywności w Akademii (szkoleniowa)

### Obecny stan
- `training_reminder_settings`: `days_inactive=7`, `reminder_interval_days=7`, `max_reminders=3`
- `get_training_reminders_due()` zwraca **po jednym wierszu na moduł** → osobny email na każdy moduł
- `send-training-reminder` wysyła email per moduł

### Co trzeba zmienić

#### A. Zmiana ustawień
- `days_inactive` → **30** (zamiast 7)
- `max_reminders` → **1** (jedno powiadomienie, nie seryjne)
- `reminder_interval_days` → **30**

#### B. Grupowanie modułów w jeden email
- Zmienić logikę w `process-pending-notifications` (krok 7): zamiast wywoływać `send-training-reminder` per moduł, **zgrupować** wyniki `get_training_reminders_due()` po `user_id`
- Nowa Edge Function `send-training-reminder-grouped` (lub modyfikacja istniejącej):
  - Przyjmuje `userId` + listę modułów `[{moduleId, title, progressPercent, daysInactive}]`
  - Generuje **jeden email** z listą wszystkich nieukończonych modułów
  - Aktualizuje `reminder_count` i `last_reminder_sent_at` dla wszystkich assignments

#### C. Warunek: tylko gdy użytkownik jest aktywny na platformie
- W `get_training_reminders_due()` dodać warunek: `profiles.is_active = true` (nie wysyłać przypomnień zablokowanym)

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | `inactivity_settings`, kolumny profiles, RPC functions |
| `supabase/functions/send-inactivity-warning/index.ts` | **Nowy** — email ostrzegawczy 14 dni |
| `supabase/functions/send-training-reminder-grouped/index.ts` | **Nowy** — zbiorczy email o modułach |
| `supabase/functions/process-pending-notifications/index.ts` | Nowe kroki: ostrzeżenie + blokada + grupowanie przypomnień |
| `src/contexts/AuthContext.tsx` | Guard: ekran blokady gdy `is_active=false` |
| `src/components/admin/CompactUserCard.tsx` | Przycisk odblokowania |
| SQL UPDATE | `training_reminder_settings`: days=30, max=1 |

## Co NIE zmienia się
- Istniejące powiadomienia o webinarach, szkoleniach nowych
- System eventów i notyfikacji
- Auto-webinar
- `useLastSeenUpdater` — nadal aktualizuje `last_seen_at`

