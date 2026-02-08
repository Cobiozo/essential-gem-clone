
# Plan: Podgląd PureLinku w modalu + Naprawa licznika zapisanych

## Podsumowanie

### Zmiana 1: Podgląd strony rejestracji w oknie dialogowym (nie w nowej karcie)

**Obecny stan:**
Przycisk z ikoną `Eye` w panelu PureLinków otwiera stronę rejestracji (`/auth?ref=KOD`) w nowej karcie przeglądarki.

**Cel:**
Otworzyć podgląd w oknie dialogowym (modal) z iframe, aby użytkownik mógł szybko sprawdzić wygląd strony bez opuszczania panelu.

**Rozwiązanie:**
Dodać nowy komponent `ReflinkPreviewDialog` z iframe do wyświetlania strony `/auth?ref=KOD` wewnątrz modala.

**Plik:** `src/components/user-reflinks/ReflinkPreviewDialog.tsx` (NOWY)

```text
+------------------------------------------+
|  Podgląd strony rejestracji    [X]       |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |    [iframe z /auth?ref=KOD]        |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|            [Zamknij]                     |
+------------------------------------------+
```

**Plik:** `src/components/user-reflinks/UserReflinksPanel.tsx`
- Import `ReflinkPreviewDialog`
- Dodać state do zarządzania otwarciem dialogu i wybranym reflinkiem
- Zmienić `onClick` przycisku Eye z `window.open()` na otwarcie dialogu

---

### Zmiana 2: Naprawa licznika "X zapisanych" - tylko przyszłe terminy

**Obecny problem:**
Na screenie widać "1 zapisanych" wyświetlane na zielono dla wydarzenia "O!Mega Chill", mimo że użytkownik:
- Uczestniczył w spotkaniu 7 lutego (przeszłość) - pokazuje "Uczestniczył"
- NIE jest zapisany na żadne przyszłe terminy (14, 21, 28 lutego)

Licznik `registeredOccurrences.size` liczy WSZYSTKIE rejestracje (w tym przeszłe), zamiast tylko przyszłych.

**Lokalizacja błędu:** `src/components/events/EventCardCompact.tsx`

**Linie z błędem:**
- Linia 533: `const registeredCount = registeredOccurrences.size;` - liczy wszystkie, w tym przeszłe
- Linia 534: `const hasAnyRegistration = isMultiOccurrence ? registeredCount > 0 : isRegistered;` - błędnie pokazuje zielony badge
- Linia 581-584: Badge "X zapisanych" pokazuje się przy `hasAnyRegistration`

**Rozwiązanie:**
Filtrować `registeredOccurrences` aby liczyć tylko te, które dotyczą PRZYSZŁYCH terminów.

**Logika:**
```typescript
// Pobierz indeksy przyszłych terminów
const futureOccurrenceIndices = new Set(futureOccurrences.map(occ => occ.index));

// Oblicz rejestracje TYLKO na przyszłe terminy
const futureRegisteredCount = [...registeredOccurrences].filter(
  occIndex => occIndex !== null && futureOccurrenceIndices.has(occIndex)
).length;

// Badge pokazuje się tylko gdy są rejestracje na PRZYSZŁE terminy
const hasAnyFutureRegistration = isMultiOccurrence 
  ? futureRegisteredCount > 0 
  : isRegistered;
```

---

## Szczegóły techniczne

### Plik 1: `src/components/user-reflinks/ReflinkPreviewDialog.tsx` (NOWY)

```tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface ReflinkPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflinkCode: string;
  targetRole: string;
}

export const ReflinkPreviewDialog: React.FC<ReflinkPreviewDialogProps> = ({
  open,
  onOpenChange,
  reflinkCode,
  targetRole,
}) => {
  const previewUrl = `/auth?ref=${reflinkCode}`;
  const fullUrl = `${window.location.origin}${previewUrl}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Podgląd strony rejestracji</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fullUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Otwórz w nowej karcie
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 border rounded-lg overflow-hidden bg-white">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Podgląd strony rejestracji"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Plik 2: `src/components/user-reflinks/UserReflinksPanel.tsx`

**Zmiany:**

1. Import nowego komponentu:
```tsx
import { ReflinkPreviewDialog } from './ReflinkPreviewDialog';
```

2. Nowy state:
```tsx
const [previewReflink, setPreviewReflink] = useState<UserReflink | null>(null);
```

3. Zmiana onClick przycisku Eye (linia 290-297):
```tsx
<Button
  size="sm"
  variant="ghost"
  onClick={() => setPreviewReflink(reflink)}  // Zmiana z window.open
  title="Podgląd strony rejestracji"
>
  <Eye className="w-4 h-4" />
</Button>
```

4. Dodanie dialogu przed zamknięciem komponentu Card:
```tsx
{/* Preview Dialog */}
<ReflinkPreviewDialog
  open={!!previewReflink}
  onOpenChange={(open) => !open && setPreviewReflink(null)}
  reflinkCode={previewReflink?.reflink_code || ''}
  targetRole={previewReflink?.target_role || ''}
/>
```

### Plik 3: `src/components/events/EventCardCompact.tsx`

**Zmiany w liniach 532-534:**

Przed:
```tsx
// Count registered occurrences for header badge
const registeredCount = registeredOccurrences.size;
const hasAnyRegistration = isMultiOccurrence ? registeredCount > 0 : isRegistered;
```

Po:
```tsx
// Count registered occurrences ONLY for future dates (not past)
const futureOccurrenceIndices = new Set(futureOccurrences.map(occ => occ.index));

const futureRegisteredCount = isMultiOccurrence 
  ? [...registeredOccurrences].filter(
      occIndex => occIndex !== null && futureOccurrenceIndices.has(occIndex)
    ).length
  : 0;

// For header badge - only show if registered for FUTURE occurrences
const hasAnyRegistration = isMultiOccurrence 
  ? futureRegisteredCount > 0 
  : isRegistered;
```

**Zmiany w liniach 581-584 (badge display):**

Przed:
```tsx
{hasAnyRegistration && (
  <Badge variant="secondary" className="text-xs bg-green-100 ...">
    <Check className="h-3 w-3 mr-1" />
    {isMultiOccurrence ? `${registeredCount} zapisanych` : 'Zapisany'}
  </Badge>
)}
```

Po:
```tsx
{hasAnyRegistration && (
  <Badge variant="secondary" className="text-xs bg-green-100 ...">
    <Check className="h-3 w-3 mr-1" />
    {isMultiOccurrence ? `${futureRegisteredCount} zapisanych` : 'Zapisany'}
  </Badge>
)}
```

**Zmiany w liniach 689-691 (details section):**

Przed:
```tsx
<Badge variant="secondary" className="ml-auto text-xs">
  {registeredOccurrences.size} / {futureOccurrences.length} zapisanych
</Badge>
```

Po:
```tsx
<Badge variant="secondary" className="ml-auto text-xs">
  {futureRegisteredCount} / {futureOccurrences.length} zapisanych
</Badge>
```

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/user-reflinks/ReflinkPreviewDialog.tsx` | NOWY - dialog z iframe podglądu |
| `src/components/user-reflinks/UserReflinksPanel.tsx` | Import dialogu, state, zmiana onClick |
| `src/components/user-reflinks/index.ts` | Export nowego komponentu |
| `src/components/events/EventCardCompact.tsx` | Filtrowanie rejestracji do przyszłych terminów |

---

## Oczekiwany efekt

1. **Podgląd PureLinku**: Kliknięcie ikony oka otwiera modal z iframe pokazującym stronę `/auth?ref=KOD`. Użytkownik może zobaczyć jak wygląda formularz rejestracji dla nowego użytkownika, bez opuszczania panelu.

2. **Licznik zapisanych**: 
   - Dla wydarzenia z screena "O!Mega Chill": Badge "1 zapisanych" NIE będzie wyświetlany, ponieważ jedyna rejestracja (7 lutego) dotyczy przeszłego terminu
   - Zielony badge pojawi się TYLKO gdy użytkownik ma aktywne rejestracje na PRZYSZŁE terminy
   - W szczegółach nadal widoczne będzie "Uczestniczył" przy przeszłych terminach (bez zmian)
