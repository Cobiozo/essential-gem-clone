

# Plan: Naprawa wykrytych problemów (E1-E3) + zbiorczy email szkoleniowy

## Problem 1 (E1+E2): Brakujące RPC dla nieaktywności

Funkcje `get_inactive_users_for_warning` i `get_inactive_users_for_blocking` nie istnieją w bazie — CRON loguje błąd PGRST202 co 5 minut. Tabela `inactivity_settings` również nie istnieje (używana w `send-inactivity-warning`).

### Rozwiązanie

Utworzyć migrację z:

1. **Tabelą `inactivity_settings`** — konfiguracja dni ostrzeżenia (14) i blokady (30), email supportu
2. **RPC `get_inactive_users_for_warning`** — zwraca użytkowników z `last_seen_at` starszym niż 14 dni, aktywnych (`is_active = true`), bez wysłanego ostrzeżenia (`inactivity_warning_sent_at IS NULL` lub starsze niż `last_seen_at`), z LIMIT 10 i SECURITY DEFINER
3. **RPC `get_inactive_users_for_blocking`** — zwraca użytkowników z `last_seen_at` starszym niż 30 dni, aktywnych, z LIMIT 10 i SECURITY DEFINER

Kolumna `last_seen_at` istnieje w profiles — to jest źródło aktywności (aktualizowane przy każdym loginie/nawigacji).

**Bezpieczeństwo**: Domyślnie wstawiam `inactivity_settings` z `warning_days = 14, block_days = 30`. Obie RPC mają `SET search_path TO 'public'` i `SET row_security = off`.

---

## Problem 2 (E3): Chat notification używa Resend zamiast SMTP

`send-chat-notification-email` importuje `npm:resend@4.0.0` i wymaga `RESEND_API_KEY`. Reszta systemu używa SMTP z tabeli `smtp_settings`.

### Rozwiązanie

Przepisać `send-chat-notification-email/index.ts` na wzorzec SMTP identyczny z innymi funkcjami (np. `send-inactivity-warning`). Usunąć import Resend. Pobrać ustawienia SMTP z `smtp_settings`, użyć `wrapWithBranding` dla spójnego wyglądu. Zachować istniejącą logikę: sprawdzenie preferencji, sprawdzenie online/offline (5min), push jako pierwszy kanał, email jako fallback.

---

## Problem 3: Wiele emaili szkoleniowych zamiast jednego zbiorczego

### Przyczyna

Trigger `assign_training_modules_on_role_insert` tworzy po rejestracji N wpisów w `training_assignments` z `notification_sent = false`. CRON w kroku 4 pobiera je przez `get_training_assignments_without_notification` i **wysyła osobny email na każde przypisanie** — iterując `send-training-notification` w pętli.

### Rozwiązanie

Zmienić krok 4 w `process-pending-notifications` tak, aby **grupować przypisania po `user_id`** i wywoływać **istniejącą** funkcję `send-training-reminder-grouped` (która już obsługuje wiele modułów w jednym mailu) zamiast `send-training-notification` per moduł.

Logika:
```
// Grupowanie po user_id
const byUser = Map<user_id, assignment[]>
for each user:
  modules = [{title, moduleId}]
  invoke("send-training-reminder-grouped", { userId, modules })
  mark all assignments as notification_sent = true
```

Funkcja `send-training-notification` pozostaje nietknięta (może być używana do ręcznego powiadomienia o pojedynczym module).

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| **Migracja SQL** | Tabela `inactivity_settings` + RPC `get_inactive_users_for_warning` + `get_inactive_users_for_blocking` |
| `supabase/functions/send-chat-notification-email/index.ts` | Przepisanie z Resend na SMTP |
| `supabase/functions/process-pending-notifications/index.ts` | Krok 4: grupowanie przypisań po user_id, użycie `send-training-reminder-grouped` |

## Weryfikacja po wdrożeniu

- Sprawdzenie logów `process-pending-notifications` — brak PGRST202
- Sprawdzenie logów `send-chat-notification-email` — SMTP zamiast Resend
- Test: czy nowy użytkownik z 10 modułami dostaje 1 zbiorczy email

