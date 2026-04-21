
# Ukrycie ikony PLC OMEGA BASE (lupy) na stronach rejestracji na wydarzenia

## Diagnoza
Pływająca ikona lupy „PLC OMEGA BASE" pochodzi z komponentu `MedicalChatWidget`, który w `src/App.tsx` (`ChatWidgetsWrapper`, linie 184–206) jest renderowany globalnie i ukrywany tylko dla:
- braku zalogowanego użytkownika,
- ścieżek `/infolink/...`,
- ścieżek `/meeting-room/...`,
- ścieżek `/auto-webinar` i `/a-w`,
- stron partnerskich (top-level path nie pasujący do żadnego prefiksu).

**Strony rejestracji gości** (`/events/register/:eventId` oraz `/e/:slug`) nie są w żadnej z tych grup, więc widget pojawia się także na nich — i to widać na zrzucie (prawy dolny róg).

Dodatkowo: ścieżka `/e/:slug` zaczyna się od `/e`, ale prefix `/events` nie jest tym samym, więc niezalogowany gość **nie widzi widgetu** (bo na początku jest `if (!user) return null`). Widget pojawia się dopiero, gdy formularz rejestracji oglądają **zalogowani użytkownicy** (np. partnerzy testujący swój link). Dla zalogowanych również trzeba ukryć widget na tych dwóch ścieżkach.

## Zmiana

### `src/App.tsx` — `ChatWidgetsWrapper` (linie 184–206)
Dodać dwa warunki ukrycia: rejestracja gościa po `eventId` oraz rejestracja po slug-u.

```tsx
const ChatWidgetsWrapper = () => {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const isInfoLinkPage = path.startsWith('/infolink/');
  const isMeetingPage = path.startsWith('/meeting-room/');
  const isAutoWebinarPage = path.startsWith('/auto-webinar') || path.startsWith('/a-w');
  // NOWE: strony rejestracji gości na wydarzenia
  const isEventRegistrationPage =
    path.startsWith('/events/register/') || path.startsWith('/e/');

  const knownPrefixes = ['/admin', '/dashboard', '/login', '/register', '/reset', '/messages', '/calendar', '/training', '/settings', '/my-account', '/events', '/tools', '/compass', '/clients', '/team', '/knowledge', '/meeting-room', '/infolink', '/auto-webinar', '/a-w', '/certificates', '/leaderboard', '/auth'];
  const isPartnerPage = path !== '/' && !knownPrefixes.some(p => path.startsWith(p));

  if (
    !user ||
    isInfoLinkPage ||
    isMeetingPage ||
    isAutoWebinarPage ||
    isEventRegistrationPage ||
    isPartnerPage
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <MedicalChatWidget />
    </Suspense>
  );
};
```

To wystarczy — ścieżka `/e/...` (wcześniej traktowana jako „partner page" tylko dla niezalogowanych przez fallback `!knownPrefixes`) zostaje teraz jawnie wyłączona dla wszystkich, a `/events/register/...` (wcześniej w ogóle nieobjęte wykluczeniem) również.

## Aktualizacja pamięci
Zaktualizować `mem://architecture/ui/chat-widget-visibility-policy`, dopisując dwie nowe ścieżki do listy stron, na których widget PLC OMEGA BASE jest ukrywany: `/events/register/:eventId` oraz `/e/:slug`.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/App.tsx` | Dodanie `isEventRegistrationPage` do warunków ukrycia widgetu w `ChatWidgetsWrapper` |
| `mem://architecture/ui/chat-widget-visibility-policy` | Dopisanie ścieżek rejestracji gości do polityki widoczności |

## Efekt
Pływająca ikona lupy PLC OMEGA BASE znika ze wszystkich okien rejestracji na wydarzenia (`/events/register/:eventId` i `/e/:slug`) — zarówno dla niezalogowanych gości, jak i dla zalogowanych użytkowników (np. partnerów testujących link). Pozostałe miejsca aplikacji (dashboard, akademia, CRM itd.) zachowują widget bez zmian.
