

# Plan: Rozbudowa historii logowań — nowy wygląd + nieudane logowania

## Zmiany

### 1. Migracja bazy — nowe kolumny w `login_audit_log`

```sql
ALTER TABLE public.login_audit_log 
  ADD COLUMN login_status text NOT NULL DEFAULT 'success',
  ADD COLUMN failure_reason text;
```

### 2. Nowa edge function `track-failed-login`

Endpoint bez wymagania auth (bo logowanie się nie powiodło):
- Przyjmuje `email`, `error_code`, `user_agent`
- Parsuje UA (reuse logiki z `track-login`)
- Geolokacja IP
- Szuka `user_id` po emailu w `profiles` (opcjonalne)
- Insert do `login_audit_log` z `login_status = 'failed'`, `failure_reason` zmapowany z kodu błędu
- Rate limit: max 10 insertów per IP per 15 min

### 3. `track-login/index.ts` — dodanie `login_status: 'success'`

Jednolinijkowa zmiana w insercie.

### 4. `AuthContext.tsx` — śledzenie nieudanych logowań

W bloku `if (error)` po `signInWithPassword` — fire-and-forget wywołanie `track-failed-login`:
```typescript
supabase.functions.invoke('track-failed-login', {
  body: { email, error_code: error.message, user_agent: navigator.userAgent }
}).catch(() => {});
```

### 5. Przebudowa `SecurityLoginHistory.tsx` — zgodnie ze screenshotem

**Kolumny tabeli** (wg screena):

| Lp. | Data logowania | Status logowania | Ocena | Adres IP | Kraj | Typ urządzenia | System operacyjny | Przeglądarka |

**Elementy UI:**
- **Lp.** — numer wiersza obliczany z `page * pageSize + index + 1`
- **Status logowania** — zielona ikona CheckCircle (`success`) / czerwona XCircle (`failed`) + tekst "Poprawne"/"Nieudane" + opcjonalnie `failure_reason`
- **Ocena** — osobna kolumna: zielona CheckCircle (OK) / żółta AlertTriangle (Podejrzane)
- **Kraj** — emoji flaga (konwersja country code → emoji) + nazwa
- **Typ urządzenia** — ikona Monitor/Tablet/Smartphone + tekst
- **System / Przeglądarka** — tekst

**Filtry** (nad tabelą, w jednym wierszu):
- Zakres dat: dwa inputy `date` (Od / Do)
- Status: dropdown (Wszystkie / Poprawne / Nieudane)
- Ocena: dropdown (Wszystkie / OK / Podejrzane)
- Szukaj po IP: input tekstowy

**Paginacja** (pod tabelą):
- Selektor rozmiaru strony (12 / 25 / 50 / 100)
- Info `1-12 / 156`
- Przyciski stron z numerami

**Usunięte kolumny** (brak na screenie): Użytkownik, Miasto — zostaną ukryte (dane nadal w DB).

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | `login_status`, `failure_reason` |
| `supabase/functions/track-failed-login/index.ts` | Nowa edge function |
| `supabase/functions/track-login/index.ts` | `login_status: 'success'` w insert |
| `src/contexts/AuthContext.tsx` | Invoke `track-failed-login` przy błędzie |
| `src/components/admin/security/SecurityLoginHistory.tsx` | Pełna przebudowa UI |

