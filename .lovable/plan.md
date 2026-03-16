

# Diagnoza: Link zaproszenia nie działa w Messengerze

## Przyczyna problemu

Facebook Messenger otwiera linki w swoim wbudowanym **WebView (in-app browser)**, który ma specyficzne zachowania:

1. **Stała sesja WebView** — jeśli użytkownik kiedykolwiek logował się na `purelife.info.pl` przez Messenger/Facebook WebView, w `localStorage` zostaje stara sesja Supabase. Przy otwarciu linku `/e/:slug`:
   - Supabase odczytuje stary refresh token → próbuje odświeżyć → **fail** (token expired/revoked)
   - Emituje `SIGNED_OUT` → AuthContext ustawia `user = null`
   - Ale zanim to się stanie, przez krótki moment `user` jest truthy a `rolesReady = false`
   - `InactivityHandler` (linia 336 App.tsx, uruchomiony PRZED `ProfileCompletionGuard`) może wykryć nieaktywność ze starej sesji i wymusić logout

2. **Drugi scenariusz** — `useInactivityTimeout` widzi stary timestamp ostatniej aktywności i natychmiast wywołuje `signOut()`, co resetuje stan i powoduje redirect:
   - Po logout `user = null` → ale ścieżka `/e/` jest publiczna, więc guard nie powinien blokować...
   - JEDNAK: jeśli `EventRegistrationBySlug` zdążył już wykonać `navigate('/events/register/{id}')`, a w momencie nawigacji auth state się zmienił, może nastąpić wyścig (race condition)

3. **Trzeci potencjalny scenariusz** — Messenger's WebView czasem **pre-renderuje** stronę lub cache'uje odpowiedź z pierwszego request. Jeśli w tym momencie JS wyemitował redirect do `/auth` (nawet chwilowo), WebView może to zapamiętać.

## Weryfikacja w kodzie

Trasa `/e/` jest poprawnie zdefiniowana w `PUBLIC_PATHS` (ProfileCompletionGuard.tsx linia 35) i `/events/register/` również (linia 34). Teoretycznie guard nie powinien blokować. Problem leży w **timing/race condition** między auth recovery a nawigacją komponentu.

## Plan naprawy

### Zmiana 1: EventRegistrationBySlug — ochrona przed race condition

Dodać guard, który **nie czeka na auth state** i wykonuje resolve/redirect niezależnie od stanu sesji. Aktualnie `useEffect` uruchamia się raz, ale jeśli komponent zostanie odmontowany i ponownie zamontowany (np. przez re-render ProfileCompletionGuard), efekt uruchomi się ponownie, potencjalnie tracąc kontekst.

Dodać:
- `AbortController` w useEffect, żeby anulować zapytania jeśli komponent się odmontuje
- Fallback: jeśli `navigate()` nie zadziała (komponent odmontowany), użyć `window.location.replace()` jako backup

### Zmiana 2: ProfileCompletionGuard — wcześniejsze sprawdzenie publicznych ścieżek

Przenieść sprawdzenie `isPublicPath` na **sam początek** komponentu, PRZED jakimkolwiek użyciem `user`, `loading`, `rolesReady`. Aktualnie sprawdzenie jest na linii 64, ale przed nim jest `useEffect` na linii 21-25 i inne hooki, które mogą powodować re-rendery.

Kluczowa zmiana: zamienić kolejność — najpierw `isPublicPath` check, potem reszta logiki auth.

### Zmiana 3: Dodać meta tag dla Messenger WebView

W `EventRegistrationBySlug` i `EventGuestRegistration` dodać `<meta>` tag, który zapobiega cache'owaniu przez Facebook WebView:
```html
<meta property="og:updated_time" content="{timestamp}" />
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
```

### Zmiana 4: EventRegistrationBySlug — fallback na window.location

Zamiast polegać wyłącznie na React Router `navigate()`, dodać fallback na `window.location.replace()` dla WebView user-agents (FBAN, FBAV, Messenger):

```typescript
const isMessengerWebView = /FBAN|FBAV|Messenger/i.test(navigator.userAgent);

if (isMessengerWebView) {
  window.location.replace(`/events/register/${event.id}${qs ? `?${qs}` : ''}`);
} else {
  navigate(`/events/register/${event.id}${qs ? `?${qs}` : ''}`, { replace: true });
}
```

### Pliki do zmiany:
| Plik | Zmiana |
|------|--------|
| `src/pages/EventRegistrationBySlug.tsx` | Dodanie WebView detection + window.location fallback + abort controller |
| `src/components/profile/ProfileCompletionGuard.tsx` | Przesunięcie public path check na sam początek, przed auth hooks |

