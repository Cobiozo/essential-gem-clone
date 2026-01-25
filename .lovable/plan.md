
# Plan: Naprawa auto-wylogowania + ograniczenie automatycznego samouczka

## Część A: Naprawa auto-wylogowania podczas odtwarzania wideo

### Zidentyfikowane problemy

1. **Brak świadomości o odtwarzaniu wideo** - `useInactivityTimeout` nasłuchuje tylko na fizyczne interakcje użytkownika (click, scroll, keydown), ale nie wie że wideo jest odtwarzane
2. **Wylogowanie mimo aktywności** - `handleVisibilityChange` może wylogować zbyt wcześnie przy przełączaniu kart

### Rozwiązanie: Event-based video activity

Komponent `SecureMedia` będzie emitować niestandardowe zdarzenia DOM (`video-activity`), które `useInactivityTimeout` będzie nasłuchiwać i resetować timer.

#### Modyfikacje w `src/components/SecureMedia.tsx`

Dodać emisję zdarzeń aktywności podczas odtwarzania wideo:

```typescript
// Nowy ref do throttlingu emisji
const lastActivityEmitRef = useRef<number>(0);

// W handlePlay:
const handlePlay = () => {
  setIsPlaying(true);
  onPlayStateChangeRef.current?.(true);
  
  // Informuj system o aktywności wideo
  window.dispatchEvent(new CustomEvent('video-activity', { 
    detail: { type: 'play' } 
  }));
};

// W handleTimeUpdate (throttled - co 10 sekund):
const handleTimeUpdate = () => {
  // ... istniejący kod ...
  
  // Throttled: emituj zdarzenie co ~10 sekund podczas odtwarzania
  const now = Date.now();
  if (now - lastActivityEmitRef.current >= 10000) {
    lastActivityEmitRef.current = now;
    window.dispatchEvent(new CustomEvent('video-activity', { 
      detail: { type: 'timeupdate' } 
    }));
  }
};
```

#### Modyfikacje w `src/hooks/useInactivityTimeout.ts`

Dodać nasłuchiwanie na zdarzenia wideo:

```typescript
// NOWE: Obsługa aktywności wideo (bez throttlingu - już throttled w SecureMedia)
const handleVideoActivity = () => {
  console.log('[useInactivityTimeout] Video activity detected, resetting timer');
  resetTimer();
};

// W sekcji event listeners:
window.addEventListener('video-activity', handleVideoActivity);

// W cleanup:
window.removeEventListener('video-activity', handleVideoActivity);

// W handleVisibilityChange - dodać bufor 1 minuty:
const handleVisibilityChange = () => {
  if (!document.hidden) {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    // Dodaj bufor 1 minuty dla bezpieczeństwa
    const timeoutWithBuffer = INACTIVITY_TIMEOUT_MS + 60000;
    
    if (timeSinceLastActivity >= timeoutWithBuffer) {
      handleLogout();
    } else {
      resetTimer();
    }
  }
};
```

---

## Część B: Ograniczenie automatycznego samouczka

### Obecna logika

Samouczek wyświetla się gdy:
- `isFreshLogin === true` (świeże logowanie)
- `tutorial_completed !== true`
- `tutorial_skipped !== true`

### Problem

`isFreshLogin` jest ustawiany przy KAŻDYM logowaniu, więc samouczek pokazuje się za każdym razem dla użytkowników którzy go wcześniej nie ukończyli.

### Rozwiązanie

Zmienić logikę tak, aby samouczek automatycznie wyświetlał się **tylko raz** - podczas **pierwszego logowania** po rejestracji i zatwierdzeniu przez admina.

#### Modyfikacje w `src/hooks/useOnboardingTour.ts`

```typescript
useEffect(() => {
  const checkTutorialStatus = async () => {
    if (!user || !profile) return;

    const tutorialCompleted = (profile as any)?.tutorial_completed;
    const tutorialSkipped = (profile as any)?.tutorial_skipped;
    const tutorialShownOnce = (profile as any)?.tutorial_shown_once;

    // NOWA LOGIKA: Pokazuj automatycznie TYLKO jeśli:
    // 1. Jest to pierwsze świeże logowanie (isFreshLogin)
    // 2. Samouczek nie był jeszcze pokazany automatycznie (tutorial_shown_once !== true)
    // 3. Samouczek nie został ukończony ani pominięty
    if (isFreshLogin && !tutorialShownOnce && !tutorialCompleted && !tutorialSkipped) {
      setTimeout(() => {
        setShowWelcomeDialog(true);
      }, 1000);
      
      // Oznacz że samouczek był już raz automatycznie pokazany
      await supabase
        .from('profiles')
        .update({ tutorial_shown_once: true })
        .eq('id', user.id);
    }
  };

  checkTutorialStatus();
}, [user, profile, isFreshLogin]);
```

#### Dodanie kolumny w bazie danych

Dodać kolumnę `tutorial_shown_once` (boolean, default false) do tabeli `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_shown_once boolean DEFAULT false;
```

---

## Część C: Ikonka "i" do ręcznego uruchomienia samouczka

### Lokalizacja

Ikonka będzie umieszczona w topbarze, obok `ThemeSelector` (przycisk zmiany motywu jasnego/ciemnego).

### Modyfikacje w `src/components/dashboard/DashboardTopbar.tsx`

Dodać nowy przycisk z ikonką `Info` (z lucide-react):

```typescript
import { Info } from 'lucide-react';

// W sekcji Right side - Actions, przed ThemeSelector:
{/* Tutorial help button */}
<Button
  variant="ghost"
  size="icon"
  onClick={() => window.dispatchEvent(new CustomEvent('startOnboardingTour'))}
  className="h-9 w-9"
  title="Samouczek"
  data-tour="tutorial-button"
>
  <Info className="h-4 w-4" />
</Button>
```

#### Kolejność przycisków w topbarze po zmianie:

1. Classic view toggle (tylko admin)
2. Notifications (dzwonek)
3. Language selector
4. **Tutorial button (NOWY - ikonka "i")**
5. Theme selector
6. User avatar dropdown

---

## Podsumowanie plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Dodanie emisji zdarzenia `video-activity` w handlePlay i handleTimeUpdate (throttled co 10s) |
| `src/hooks/useInactivityTimeout.ts` | Nasłuchiwanie `video-activity` + bufor 1 min w handleVisibilityChange |
| `src/hooks/useOnboardingTour.ts` | Nowa logika: samouczek automatycznie tylko raz (sprawdzanie `tutorial_shown_once`) |
| `src/components/dashboard/DashboardTopbar.tsx` | Dodanie przycisku "i" do uruchamiania samouczka |

---

## Migracja bazy danych

Dodanie nowej kolumny do tabeli `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_shown_once boolean DEFAULT false;
```

---

## Oczekiwany rezultat

### Auto-wylogowanie:
1. Timer nieaktywności jest resetowany co ~10 sekund podczas oglądania wideo
2. Użytkownik nie zobaczy ostrzeżenia o wylogowaniu podczas szkolenia
3. Po zatrzymaniu wideo standardowy timer 30 minut rozpoczyna odliczanie
4. Bufor 1 minuty przy powrocie do karty zapobiega nagłym wylogowaniom

### Samouczek:
1. Samouczek automatycznie pojawia się **tylko raz** - podczas pierwszego logowania po rejestracji i zatwierdzeniu
2. Przy kolejnych logowaniach samouczek się NIE pojawia automatycznie
3. Użytkownik może w dowolnym momencie uruchomić samouczek klikając ikonkę "i" obok przełącznika motywu
4. Ikonka "i" w kółeczku jest widoczna dla wszystkich użytkowników
5. Kliknięcie ikonki otwiera dialog powitalny samouczka
