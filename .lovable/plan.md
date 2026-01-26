
# Plan naprawy wideo i nawigacji w panelu administracyjnym

## Zidentyfikowane problemy

### Problem 1: Wideo nie zatrzymuje się przy zmianie zakładki
Komponent `SecureMedia.tsx` posiada logikę pauzowania wideo przy zmianie zakładki przeglądarki, ale jest ona **ograniczona tylko do trybu restricted** (gdy `disableInteraction = true`). Materiały "Zdrowa Wiedza" używają trybu unrestricted, więc wideo kontynuuje odtwarzanie w tle.

**Lokalizacja:** `src/components/SecureMedia.tsx` linia 913 - warunek `if (mediaType !== 'video' || !disableInteraction) return;` blokuje pauzowanie dla materiałów w trybie unrestricted.

### Problem 2: Panel admina przeskakuje do głównej zakładki
Stan aktywnej zakładki w panelu admin jest przechowywany tylko w `useState("content")` bez persystencji. Przy zmianie zakładki przeglądarki różne efekty (np. presence tracking) mogą wywoływać re-rendery, które resetują widok.

**Lokalizacja:** `src/pages/Admin.tsx` linia 281 - `const [activeTab, setActiveTab] = useState("content");`

### Problem 3: Zatwierdzanie lekcji zamyka rozwinięty widok
Funkcja `approveLessonProgress` wywołuje `fetchUserProgress()` po zapisie, co odświeża całą listę użytkowników. Komponenty `Collapsible` nie mają śledzenia stanu `open`, więc wszystkie się zamykają.

**Lokalizacja:** `src/components/admin/TrainingManagement.tsx` linie 821, 1452, 1486 - brak persystencji stanu rozwinięcia.

---

## Rozwiązania

### Zmiana 1: Wideo pauzuje przy zmianie zakładki (dla wszystkich trybów)

**Plik:** `src/components/SecureMedia.tsx`

Usunięcie warunku `!disableInteraction` z efektu visibility, aby wideo pauzowało się dla wszystkich materiałów:

```tsx
// Linia 911-931 - PRZED:
useEffect(() => {
  if (mediaType !== 'video' || !disableInteraction) return;
  // ...
}, [mediaType, disableInteraction]);

// PO:
useEffect(() => {
  if (mediaType !== 'video') return;
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setIsTabHidden(true);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else {
      setIsTabHidden(false);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [mediaType]); // Usunięto disableInteraction
```

### Zmiana 2: Persystencja zakładki admina w URL

**Plik:** `src/pages/Admin.tsx`

Użycie `useSearchParams` zamiast `useState` do przechowywania aktywnej zakładki:

```tsx
// PRZED (linia 281):
const [activeTab, setActiveTab] = useState("content");

// PO:
import { useSearchParams } from 'react-router-dom';

// W komponencie:
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'content';

const setActiveTab = useCallback((tab: string) => {
  setSearchParams(prev => {
    prev.set('tab', tab);
    return prev;
  }, { replace: true });
}, [setSearchParams]);
```

Dzięki temu:
- URL będzie zawierał `/admin?tab=szkolenia`
- Zmiana zakładki przeglądarki nie zresetuje widoku
- Historia przeglądarki będzie działać poprawnie

### Zmiana 3: Śledzenie stanu rozwinięcia w TrainingManagement

**Plik:** `src/components/admin/TrainingManagement.tsx`

Dodanie stanu do śledzenia rozwiązanych użytkowników i modułów:

```tsx
// Nowe stany (po linii 164):
const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

// Funkcje pomocnicze:
const toggleUserExpanded = (userId: string) => {
  setExpandedUsers(prev => {
    const next = new Set(prev);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    return next;
  });
};

const toggleModuleExpanded = (key: string) => {
  setExpandedModules(prev => {
    const next = new Set(prev);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    return next;
  });
};
```

Modyfikacja Collapsible dla użytkowników:

```tsx
// PRZED (linia 1452):
<Collapsible key={progressUser.user_id}>

// PO:
<Collapsible 
  key={progressUser.user_id}
  open={expandedUsers.has(progressUser.user_id)}
  onOpenChange={() => toggleUserExpanded(progressUser.user_id)}
>
```

Modyfikacja Collapsible dla modułów:

```tsx
// PRZED (linia 1486):
<Collapsible key={module.module_id}>

// PO:
const moduleKey = `${progressUser.user_id}-${module.module_id}`;
<Collapsible 
  key={module.module_id}
  open={expandedModules.has(moduleKey)}
  onOpenChange={() => toggleModuleExpanded(moduleKey)}
>
```

---

## Wizualizacja zmian

```text
PRZED:
┌───────────────────────────────────────────────┐
│ Zmiana zakładki przeglądarki                  │
│                    ↓                          │
│ [Wideo gra dalej] [Admin → zakładka główna]   │
│                    ↓                          │
│ [Zatwierdzam lekcję → widok się zamyka]       │
└───────────────────────────────────────────────┘

PO:
┌───────────────────────────────────────────────┐
│ Zmiana zakładki przeglądarki                  │
│                    ↓                          │
│ [Wideo PAUZA] [Admin → ta sama zakładka]      │
│                    ↓                          │
│ [Zatwierdzam lekcję → widok pozostaje]        │
└───────────────────────────────────────────────┘
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `SecureMedia.tsx` | Usunięcie warunku `!disableInteraction` z visibility handler |
| `Admin.tsx` | Persystencja `activeTab` w URL query params |
| `TrainingManagement.tsx` | Dodanie `expandedUsers` i `expandedModules` state |

---

## Sekcja techniczna

### SecureMedia.tsx - pauzowanie wideo (linie 911-931)

```tsx
// Zmienić warunek z:
if (mediaType !== 'video' || !disableInteraction) return;

// Na:
if (mediaType !== 'video') return;

// I usunąć disableInteraction z dependency array:
}, [mediaType]); // zamiast [mediaType, disableInteraction]
```

### Admin.tsx - persystencja zakładki

```tsx
// Dodać import (linia 7):
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

// Zastąpić useState (linia 281):
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'content';

const setActiveTab = useCallback((tab: string) => {
  setSearchParams(prev => {
    prev.set('tab', tab);
    return prev;
  }, { replace: true });
}, [setSearchParams]);
```

### TrainingManagement.tsx - stan rozwinięcia

```tsx
// Po linii 164 dodać:
const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

const toggleUserExpanded = useCallback((userId: string) => {
  setExpandedUsers(prev => {
    const next = new Set(prev);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    return next;
  });
}, []);

const toggleModuleExpanded = useCallback((key: string) => {
  setExpandedModules(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}, []);

// Linia 1452 - zmienić Collapsible użytkownika:
<Collapsible 
  key={progressUser.user_id}
  open={expandedUsers.has(progressUser.user_id)}
  onOpenChange={() => toggleUserExpanded(progressUser.user_id)}
>

// Linia 1486 - zmienić Collapsible modułu:
// Najpierw dodać przed return w mapowaniu:
const moduleKey = `${progressUser.user_id}-${module.module_id}`;
// Potem:
<Collapsible 
  key={module.module_id}
  open={expandedModules.has(moduleKey)}
  onOpenChange={() => toggleModuleExpanded(moduleKey)}
>
```
