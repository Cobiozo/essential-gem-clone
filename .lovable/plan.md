

# Ochrona aktywnej pracy + zegar sesji z przyciskiem odświeżenia

## Zakres zmian

### 1. Przebudowa `useInactivityTimeout` (`src/hooks/useInactivityTimeout.ts`)

**Nowa logika:**
- Hook przyjmuje dodatkowy parametr `pathname` (z `useLocation`)
- Definiuje chronione trasy: `/szkolenia/`, `/skills-assessment`, `/zdrowa-wiedza/`, `/meeting-room/`
- Na chronionych trasach: timer jest automatycznie resetowany co 60s (użytkownik aktywnie pracuje)
- Po upływie 30 min **bez aktywności**: zamiast cichego logout → ustawia `showSessionDialog = true`
- Dialog daje 60s na reakcję; po 60s → logout
- Przy powrocie na kartę po timeout → dialog zamiast natychmiastowego logout
- Usunięcie toast-warning (`showWarning`) — zastąpiony dialogiem

**Nowy return z hooka:**
```typescript
return {
  showSessionDialog: boolean;
  dialogCountdown: number;        // sekundy do auto-logout (60→0)
  onContinueSession: () => void;  // reset timer + zamknij dialog
  onConfirmLogout: () => void;    // natychmiastowy logout
  timeRemaining: number;          // sekundy do końca timeout (do zegara)
  onRefreshTimer: () => void;     // ręczny reset timera (przycisk)
};
```

### 2. Nowy komponent `SessionTimeoutDialog` (`src/components/SessionTimeoutDialog.tsx`)

Modalny `AlertDialog`:
- Tytuł: "Czy kontynuujesz pracę?"
- Opis: "Nie wykryliśmy aktywności. Za X sekund nastąpi automatyczne wylogowanie."
- Odliczanie 60→0
- Przycisk "Kontynuuję" (primary) → `onContinueSession`
- Przycisk "Wyloguj" (outline) → `onConfirmLogout`

### 3. Nowy komponent `SessionTimer` (`src/components/SessionTimer.tsx`)

Widoczny zegar w stylu ze screena (żółty tekst `HH:MM:SS` + przycisk odświeżenia):
- Wyświetla `timeRemaining` w formacie `HH:MM:SS`
- Przycisk z ikoną `RefreshCw` obok — klik wywołuje `onRefreshTimer` (resetuje timer do 30 min)
- Pozycja: fixed, prawy dolny róg (lub w headerze — małe, nieinwazyjne)
- Kolor zmienia się: normalny → żółty (< 5 min) → czerwony (< 1 min)
- Ukryty na chronionych trasach (timer zawieszony, zegar niepotrzebny)

### 4. Integracja w `App.tsx`

`InactivityHandler` przestaje zwracać `null` — renderuje `SessionTimeoutDialog` + `SessionTimer`:

```typescript
const InactivityHandler = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const {
    showSessionDialog, dialogCountdown,
    onContinueSession, onConfirmLogout,
    timeRemaining, onRefreshTimer
  } = useInactivityTimeout({ 
    enabled: !!user, signOut, pathname: location.pathname 
  });
  useLastSeenUpdater();
  
  if (!user) return null;
  
  return (
    <>
      <SessionTimer 
        timeRemaining={timeRemaining} 
        onRefresh={onRefreshTimer}
        pathname={location.pathname}
      />
      <SessionTimeoutDialog 
        open={showSessionDialog}
        countdown={dialogCountdown}
        onContinue={onContinueSession}
        onLogout={onConfirmLogout}
      />
    </>
  );
};
```

## Podsumowanie

| Plik | Zmiana |
|------|--------|
| `src/hooks/useInactivityTimeout.ts` | Chronione trasy, dialog zamiast logout, odliczanie, eksport stanu zegara |
| `src/components/SessionTimeoutDialog.tsx` | Nowy — modal potwierdzenia z 60s countdown |
| `src/components/SessionTimer.tsx` | Nowy — zegar HH:MM:SS + przycisk odświeżenia (wzór ze screena) |
| `src/App.tsx` | InactivityHandler renderuje oba komponenty |

