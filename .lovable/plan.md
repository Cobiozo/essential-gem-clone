

# Audyt sesji, autowylogowania i aktywności użytkownika

## 1. Jak wygląda sesja po zalogowaniu

```text
Użytkownik loguje się → signIn() → Supabase JWT (access_token + refresh_token)
  ├─ Access token: ~1h ważności (auto-refresh przez Supabase SDK)
  ├─ Refresh token: rotowany przy każdym odświeżeniu
  ├─ Sesja przechowywana w localStorage (persistSession: true)
  └─ AuthContext ładuje profil + rolę + MFA → ustawia rolesReady=true
```

- Supabase SDK automatycznie odświeża access token przed wygaśnięciem
- `TOKEN_REFRESHED` event jest ignorowany (nie resetuje UI) — to poprawne
- Profil jest stabilizowany referencją (`profileRef`) — nie odświeża się przy zmianie karty

## 2. Co jest traktowane jako aktywność

Hook `useInactivityTimeout` nasłuchuje **6 zdarzeń DOM**:
- `mousedown`, `keydown`, `scroll`, `touchstart`, `click`, `wheel`

Plus zdarzenia specjalne:
- `video-activity` (emitowane przez SecureMedia podczas oglądania wideo)
- `meeting-active` / `meeting-ended` (spotkania)
- `visibilitychange` (powrót na kartę)

**Co NIE jest traktowane jako aktywność:**
- `mousemove` — celowo wyłączone
- Żadne zdarzenia Supabase Realtime (np. nasłuch na nowe wiadomości, powiadomienia)
- Żadne odpowiedzi API/fetch
- Interakcje w iframe'ach (np. osadzony Jitsi, zewnętrzne widgety)

Throttle: timer jest resetowany max raz na sekundę.

## 3. Jak działa autowylogowanie

```text
Timer 30 min od ostatniej aktywności
  ├─ Po 25 min: ostrzeżenie toast ("Za 5 minut zostaniesz wylogowany")
  └─ Po 30 min: handleLogout()
       ├─ supabase.auth.signOut()     ← BEZ userInitiatedSignOutRef!
       ├─ sessionStorage.set('session_expired_message')
       └─ window.location.href = '/auth'  ← twarde przeładowanie
```

## 4. KRYTYCZNY BUG: Wyścig przy autowylogowaniu

**Problem:** `useInactivityTimeout` wywołuje `supabase.auth.signOut()` **bezpośrednio**, omijając `AuthContext.signOut()`. To oznacza, że:

1. `userInitiatedSignOutRef` **NIE jest ustawiane na `true`**
2. Supabase SDK emituje `SIGNED_OUT` event
3. AuthContext interpretuje to jako **"unexpected SIGNED_OUT"** (linia 304)
4. Uruchamia się **recovery flow** — próba `getSession()` 
5. Jeśli `signOut()` zdążył wyczyścić sesję → recovery failuje → toast "Sesja wygasła" + czyszczenie stanu
6. Ale jednocześnie `handleLogout()` robi `window.location.href = '/auth'` — **twarde przeładowanie**
7. Wynik: **podwójne wylogowanie** — raz przez AuthContext, raz przez window.location.href

To samo może wystąpić **odwrotnie**: jeśli `window.location.href` wykona się przed recovery — recovery próbuje operować na odmontowanym komponencie.

## 5. Dlaczego dochodzi do niekontrolowanych autowylogowań

Zidentyfikowane scenariusze:

### Scenariusz A: Visibility change race
1. Użytkownik przełącza kartę na 31+ minut
2. Wraca — `visibilitychange` sprawdza `timeSinceLastActivity >= timeoutWithBuffer` (31 min)
3. Timeout + buffer = 30 min + 1 min = 31 min → **natychmiastowe wylogowanie**
4. Ale użytkownik właśnie wrócił i klika — za późno, logout już trwa

### Scenariusz B: Token refresh + inactivity timer kolidacja
1. Użytkownik jest aktywny, ale Supabase SDK odświeża token
2. Jeśli refresh token jest already rotated/invalid → `SIGNED_OUT` event
3. Recovery próbuje `getSession()` — brak sesji → wylogowanie
4. Użytkownik widzi "sesja wygasła" mimo aktywności

### Scenariusz C: Throttle zjada aktywność
1. Użytkownik klika szybko w ciągu 1 sekundy
2. Tylko pierwszy klik resetuje timer (throttle blokuje resztę)
3. Jeśli timer jest blisko wygaśnięcia i klik trafi w throttle window — timer nie zostaje zresetowany
4. To raczej rzadkie, ale możliwe przy 29:59

### Scenariusz D: AuthContext signOut przy JWT expired
1. `fetchProfile()` wykrywa JWT expired (linia 154)
2. Wywołuje `supabase.auth.signOut()` — **bez** `userInitiatedSignOutRef`
3. Inactivity timer nadal działa — próbuje signOut na już wylogowanym użytkowniku

## 6. Plan naprawy

### Zmiana 1: `useInactivityTimeout` — użyj AuthContext.signOut()
**Plik:** `src/hooks/useInactivityTimeout.ts`

Zamiast bezpośredniego `supabase.auth.signOut()`, hook powinien przyjmować callback `signOut` z AuthContext, który poprawnie ustawia `userInitiatedSignOutRef = true`.

Nowa sygnatura:
```typescript
interface UseInactivityTimeoutOptions {
  enabled?: boolean;
  onLogout?: () => void;
  signOut?: () => Promise<void>;  // ← NOWE
}
```

W `handleLogout()`:
```typescript
const handleLogout = async () => {
  if (isMeetingActiveRef.current) { resetTimer(); return; }
  
  // Use AuthContext signOut which sets userInitiatedSignOutRef
  if (signOutRef.current) {
    await signOutRef.current();
  } else {
    await supabase.auth.signOut();
  }
  
  sessionStorage.setItem('session_expired_message', 'true');
  window.location.href = '/auth';
};
```

### Zmiana 2: `InactivityHandler` w App.tsx — przekaż signOut
**Plik:** `src/App.tsx`

```typescript
const InactivityHandler = () => {
  const { user, signOut } = useAuth();
  useInactivityTimeout({ enabled: !!user, signOut });
  useLastSeenUpdater();
  return null;
};
```

### Zmiana 3: Bufor visibility change — daj użytkownikowi szansę
**Plik:** `src/hooks/useInactivityTimeout.ts`

Przy powrocie na kartę po przekroczeniu timeoutu, zamiast natychmiastowego wylogowania, pokaż ostrzeżenie i daj 30 sekund na interakcję:

```typescript
const handleVisibilityChange = () => {
  if (!document.hidden) {
    if (isMeetingActiveRef.current) { resetTimer(); return; }
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
      // Show warning instead of immediate logout
      // Give user 30 seconds to interact
      showWarning();
      timeoutRef.current = setTimeout(handleLogout, 30_000);
    } else {
      resetTimer();
    }
  }
};
```

### Zmiana 4: Dodaj `mousemove` do zdarzeń aktywności
**Plik:** `src/hooks/useInactivityTimeout.ts`

Ruch myszy to najczęstszy sygnał aktywności. Obecny throttle (1s) zapobiega nadmiernym resetom, więc dodanie `mousemove` jest bezpieczne:

```typescript
const activityEvents = [
  'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel',
  'mousemove',  // ← NOWE: przeglądanie treści bez klikania
];
```

### Zmiana 5: JWT expired w fetchProfile — użyj userInitiatedSignOutRef
**Plik:** `src/contexts/AuthContext.tsx` (linia ~156)

```typescript
if (isJwtExpiredError(profileResult.error) || isJwtExpiredError(roleResult.error)) {
  console.warn('[Auth] JWT expired detected during profile fetch - clearing session');
  userInitiatedSignOutRef.current = true; // ← NOWE: prevent recovery loop
  await supabase.auth.signOut();
  // ...
}
```

## 7. Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/useInactivityTimeout.ts` | Przyjmij `signOut` callback; dodaj `mousemove`; bufor 30s przy powrocie na kartę |
| `src/App.tsx` | Przekaż `signOut` z AuthContext do InactivityHandler |
| `src/contexts/AuthContext.tsx` | Ustaw `userInitiatedSignOutRef` przy JWT expired w fetchProfile |

3 pliki, 5 precyzyjnych zmian. Żadna zmiana nie narusza istniejącej logiki — rozszerzają obecne mechanizmy o brakujące zabezpieczenia.

