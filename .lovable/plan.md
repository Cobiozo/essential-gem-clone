

# Diagnoza: Wylogowanie podczas webinaru bez komunikatu

## Problem

Użytkownik jest wylogowywany podczas live webinaru (MeetingRoom) bez komunikatu "Sesja wygasła". Prawie nie klika — tylko ogląda i słucha.

## Przyczyna główna

Brak komunikatu wyklucza `useInactivityTimeout` (który zawsze ustawia `session_expired_message`). Prawdziwa przyczyna to **nieudane odświeżanie tokenu JWT przez Supabase**.

Mechanizm:
1. Supabase access token wygasa (domyślnie co 1 godzinę)
2. SDK próbuje automatycznie odświeżyć token przez refresh token
3. Jeśli odświeżenie się nie powiedzie (np. sieciowa chwilowa przerwa, token już zrotowany przez inną kartę/PWA), SDK emituje zdarzenie `SIGNED_OUT`
4. `AuthContext.onAuthStateChange` otrzymuje `SIGNED_OUT` → ustawia `user = null` → aplikacja przekierowuje na `/auth` bez żadnego komunikatu

Widoczne w logach auth: `refresh_token_not_found` o 12:46:38, następnie login tego samego użytkownika o 12:46:42.

Dodatkowy problem: nawet jeśli `useInactivityTimeout` poprawnie obsługuje meeting (dzięki `meeting-active`), to `video-activity` jest emitowane co 60s, ale **aktywność użytkownika w hooku sprawdza tylko DOM events** (click, keydown, scroll...). Podczas pasywnego oglądania webinaru żaden z tych eventów nie występuje. Wprawdzie `video-activity` resetuje timer, ale jeśli użytkownik przełączy kartę na dłużej niż 31 minut (30 min timeout + 1 min buffer) i wróci — `handleVisibilityChange` sprawdza `isMeetingActiveRef`, ale to zależy od tego czy VideoRoom jest wciąż zamontowany.

## Plan naprawy (2 pliki)

### 1. `src/contexts/AuthContext.tsx` — Odporność na nieudane odświeżenie tokenu

Dodać mechanizm retry przy zdarzeniu `SIGNED_OUT` które nie było inicjowane przez użytkownika:

- Dodać ref `userInitiatedSignOutRef` ustawiany na `true` w metodzie `signOut()`
- W `onAuthStateChange`, gdy event = `SIGNED_OUT`:
  - Jeśli `userInitiatedSignOutRef` = true → zachowanie bez zmian (czyść stan)
  - Jeśli `userInitiatedSignOutRef` = false (nieoczekiwane wylogowanie):
    - Spróbuj `supabase.auth.getSession()` — może sesja wciąż jest ważna
    - Jeśli sesja istnieje → zignoruj SIGNED_OUT, odśwież profil
    - Jeśli sesja nie istnieje → pokaż toast "Sesja wygasła" i dopiero wtedy wyczyść stan

### 2. `src/hooks/useInactivityTimeout.ts` — Dodatkowe zabezpieczenie dla spotkań

Zmienić `handleVisibilityChange` tak, aby po powrocie na kartę z aktywnym spotkaniem zawsze dawać 5-minutowy bufor zamiast 1-minutowego:

```typescript
// Zamiast stałego 60s bufora, dla spotkań dać 5 minut
const timeoutWithBuffer = isMeetingActiveRef.current 
  ? INACTIVITY_TIMEOUT_MS + 5 * 60 * 1000 
  : INACTIVITY_TIMEOUT_MS + 60000;
```

| Plik | Zmiana |
|---|---|
| `src/contexts/AuthContext.tsx` | Dodać `userInitiatedSignOutRef`, retry przy nieoczekiwanym SIGNED_OUT, toast informacyjny |
| `src/hooks/useInactivityTimeout.ts` | Większy bufor visibilitychange dla aktywnych spotkań |

