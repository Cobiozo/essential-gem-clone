

# Audit: Systemy powiadomień o braku aktywności — stan po zmianach

## KRYTYCZNE BŁĘDY

### 1. Migracja SQL nie została zastosowana w bazie danych
Pierwsza migracja (tworzenie `inactivity_settings`, kolumn profili, RPCs) **nie zadziałała**. Stan bazy:

| Element | Oczekiwany | Faktyczny |
|---------|-----------|-----------|
| Tabela `inactivity_settings` | Istnieje | **NIE ISTNIEJE** |
| `profiles.blocked_at` | Istnieje | **NIE ISTNIEJE** |
| `profiles.block_reason` | Istnieje | **NIE ISTNIEJE** |
| `profiles.inactivity_warning_sent_at` | Istnieje | **NIE ISTNIEJE** |
| RPC `get_inactive_users_for_warning()` | Istnieje | **NIE ISTNIEJE** |
| RPC `get_inactive_users_for_blocking()` | Istnieje | **NIE ISTNIEJE** |
| `training_reminder_settings` → `days_inactive=30, max_reminders=1` | Zaktualizowane | **STARE WARTOŚCI (7/7/3)** |

**Skutek**: Logi CRON pokazują błędy:
- `Could not find the function public.get_inactive_users_for_warning`
- `Could not find the function public.get_inactive_users_for_blocking`

System ostrzeżeń i blokowania jest **całkowicie niefunkcjonalny**.

### 2. Co działa poprawnie
| Element | Status |
|---------|--------|
| RPC `get_training_reminders_due()` | OK — przebudowana z grupowaniem i filtrem `is_active=true` |
| RPC `admin_toggle_user_status()` | OK — rozszerzona o reset `blocked_at`, `block_reason`, etc. |
| Edge Function `send-inactivity-warning` | OK — kod istnieje, ale nie może działać bez RPC |
| Edge Function `send-training-reminder-grouped` | OK — kod istnieje |
| `process-pending-notifications` — Step 7 (grupowanie) | OK — logika grupowania po `user_id` |
| `process-pending-notifications` — Step 7b/7c | Kod OK, ale RPCs nie istnieją → błędy |
| `AuthContext.tsx` — guard blokady | OK — ekran blokady dla `is_active=false` |
| `CompactUserCard.tsx` — przycisk odblokowania | OK |

---

## PLAN NAPRAWY

Jedna nowa migracja SQL, która:

1. **Tworzy tabelę `inactivity_settings`** (singleton) z `warning_days=14`, `block_days=30`, `is_enabled=true`, `support_email='support@purelife.info.pl'`
2. **Dodaje kolumny do `profiles`**: `blocked_at` (timestamptz), `block_reason` (text), `inactivity_warning_sent_at` (timestamptz)
3. **Tworzy RPC `get_inactive_users_for_warning()`** — zwraca użytkowników z `last_seen_at` starszym niż `warning_days`, nie-adminów, aktywnych, jeszcze nie ostrzeganych (lub ostrzeżonych dawniej niż `warning_days` temu)
4. **Tworzy RPC `get_inactive_users_for_blocking()`** — zwraca użytkowników z `last_seen_at` starszym niż `block_days`, nie-adminów, aktywnych
5. **Aktualizuje `training_reminder_settings`**: `days_inactive=30`, `max_reminders=1`, `reminder_interval_days=30`

Po migracji: Edge Functions `send-inactivity-warning` i `send-training-reminder-grouped` należy zdeployować ponownie, aby upewnić się że działają z aktualnym kodem.

### Szczegóły techniczne — SQL RPCs

```text
get_inactive_users_for_warning():
  - JOIN profiles z user_roles (wykluczenie adminów)  
  - WHERE is_active = true
  - AND last_seen_at < now() - warning_days
  - AND (inactivity_warning_sent_at IS NULL OR inactivity_warning_sent_at < now() - warning_days)
  - RETURNS: user_id, email, first_name, days_inactive

get_inactive_users_for_blocking():
  - JOIN profiles z user_roles (wykluczenie adminów)
  - WHERE is_active = true  
  - AND last_seen_at < now() - block_days
  - RETURNS: user_id, email, first_name, days_inactive
```

### Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | Tabela, kolumny, RPCs, UPDATE settings |
| Edge Functions | Redeploy `send-inactivity-warning` i `send-training-reminder-grouped` |

Żadne zmiany w kodzie TypeScript nie są potrzebne — frontend i Edge Functions są poprawne.

