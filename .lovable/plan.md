
## Zabezpieczenie synchronizacji Google Calendar przed rozłączaniem

### Problem
Tokeny Google Calendar rozłączają się samoczynnie z trzech powodów:
1. **Brak proaktywnego odswiezania** -- tokeny wygasaja po 1h, a odswiezanie nastepuje tylko gdy uzytkownik otworzy komponent. Jesli nikt nie wejdzie na strone przez dluzszy czas, token wygasa i kolejna operacja (np. CRON reminder) zakonczy sie bledem.
2. **Nadpisywanie refresh_token wartoscia null** -- w `google-oauth-callback` upsert zawsze zapisuje `tokens.refresh_token`, nawet jesli Google go nie zwrocil (wartosc `null`/`undefined`). Utrata refresh_token = trwale rozlaczenie.
3. **Natychmiastowe usuwanie tokenow przy invalid_grant** -- brak retry logic; tymczasowy blad sieciowy lub Google API moze byc interpretowany jako trwale uniewazniony token.

### Rozwiazanie -- 3 zmiany

#### 1. Zabezpieczenie refresh_token w `google-oauth-callback/index.ts`

Zmiana logiki upsert: jesli Google nie zwrocil `refresh_token`, zachowaj istniejacy w bazie zamiast nadpisywac go wartoscia null.

```text
Obecnie:
  upsert({
    refresh_token: tokens.refresh_token,  // <-- moze byc null
    ...
  })

Po zmianie:
  - Jesli tokens.refresh_token istnieje: zapisz nowy
  - Jesli tokens.refresh_token jest null/undefined: pobierz istniejacy z bazy i uzyj go
```

#### 2. Nowa edge function `refresh-google-tokens` + CRON co 30 minut

Nowa funkcja cykliczna, ktora:
- Pobiera wszystkie rekordy z `user_google_tokens` gdzie `expires_at` < NOW() + 15 minut
- Dla kazdego rekordu wywoluje Google token refresh endpoint
- Aktualizuje `access_token` i `expires_at` w bazie
- Przy `invalid_grant`:
  - Sprawdza ile prob bylo (nowe pole `refresh_fail_count` w tabeli)
  - Jesli < 3 proby: inkrementuje licznik, NIE usuwa tokena
  - Jesli >= 3 proby: dopiero wtedy usuwa token i sync records, tworzy powiadomienie in-app dla uzytkownika
- Przy sukcesie: resetuje `refresh_fail_count` do 0

CRON schedule: co 30 minut (`*/30 * * * *`)

#### 3. Migracja bazy -- dodanie kolumny `refresh_fail_count`

```sql
ALTER TABLE user_google_tokens 
  ADD COLUMN IF NOT EXISTS refresh_fail_count integer DEFAULT 0;
```

### Szczegoly techniczne

| Element | Zmiana |
|---------|--------|
| `supabase/functions/google-oauth-callback/index.ts` | Zabezpieczenie upsert -- nie nadpisuj refresh_token jesli null |
| `supabase/functions/refresh-google-tokens/index.ts` | Nowa edge function -- proaktywne odswiezanie tokenow |
| `supabase/functions/sync-google-calendar/index.ts` | Retry logic przy `invalid_grant` -- inkrementuj `refresh_fail_count` zamiast natychmiastowego usuwania |
| `supabase/functions/check-google-calendar-busy/index.ts` | Ta sama retry logic przy `invalid_grant` |
| Migracja SQL | Dodanie kolumny `refresh_fail_count` |
| CRON SQL (insert) | Rejestracja crona `refresh-google-tokens` co 30 minut |
| `supabase/config.toml` | Rejestracja nowej funkcji z `verify_jwt = false` |

### Efekt

- Tokeny beda odswiezane co 30 minut proaktywnie, niezaleznie od aktywnosci uzytkownika
- Refresh token nigdy nie zostanie przypadkowo nadpisany wartoscia null
- Rozlaczenie nastapi dopiero po 3 nieudanych probach odswiezenia (ok. 1.5h), nie po pierwszym bledzie
- Uzytkownik dostanie powiadomienie in-app o koniecznosci ponownego polaczenia
