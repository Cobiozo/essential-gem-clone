
# Plan: Definitywna naprawa dialogu podglądu PureLink

## Diagnoza problemu

Dialog podglądu otwiera się, mruga i zamyka z trzech powodów:

### Przyczyna 1: Focus Trap (częściowo naprawiona)
Radix Dialog przechwytuje focus. Kiedy iframe ładuje stronę, focus może przejść do iframe, co Dialog interpretuje jako "interact outside" i zamyka się. Dodano już `onInteractOutside` i `onPointerDownOutside`, ale to nie wystarczy.

### Przyczyna 2: onEscapeKeyDown (brak ochrony)
Escape jest nadal obsługiwany przez Dialog i może go zamykać w nieoczekiwanych momentach podczas ładowania iframe.

### Przyczyna 3: onFocusOutside (główna przyczyna!)
Kiedy iframe wewnątrz DialogContent zaczyna się ładować i dokument w iframe próbuje uzyskać focus, Radix Dialog interpretuje utratę focusu z głównego dokumentu jako "focus outside" i **automatycznie wywołuje zamknięcie**.

Sprawdzam w dokumentacji Radix:
- `onInteractOutside` - zapobiega zamknięciu przy kliknięciu poza dialog
- `onPointerDownOutside` - zapobiega zamknięciu przy mousedown poza dialog  
- **`onFocusOutside`** - zapobiega zamknięciu gdy focus przechodzi poza dialog (np. do iframe!)

---

## Rozwiązanie

### Zmiana w `ReflinkPreviewDialog.tsx`

Dodać brakującą właściwość `onFocusOutside`:

```tsx
<DialogContent 
  className="max-w-4xl h-[85vh] flex flex-col"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}  // ← BRAKUJĄCE!
>
```

### Dodatkowe zabezpieczenie: opóźnione ładowanie iframe

Dla pewności, że dialog nie zostanie zamknięty przez żadne race conditions podczas mount:

```tsx
const [iframeSrc, setIframeSrc] = useState<string | null>(null);

useEffect(() => {
  if (open && reflinkCode) {
    // Opóźnij ładowanie iframe o 100ms aby dialog miał czas się w pełni otworzyć
    const timer = setTimeout(() => {
      setIframeSrc(`/auth?ref=${reflinkCode}&preview=true`);
    }, 100);
    return () => clearTimeout(timer);
  } else {
    setIframeSrc(null);
  }
}, [open, reflinkCode]);
```

I w JSX:
```tsx
{iframeSrc ? (
  <iframe src={iframeSrc} ... />
) : (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin ...">Ładowanie...</div>
  </div>
)}
```

---

## Szczegóły implementacji

### Plik: `src/components/user-reflinks/ReflinkPreviewDialog.tsx`

**Pełna nowa wersja:**

```tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';

interface ReflinkPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflinkCode: string;
}

export const ReflinkPreviewDialog: React.FC<ReflinkPreviewDialogProps> = ({
  open,
  onOpenChange,
  reflinkCode,
}) => {
  // Delayed iframe loading to prevent focus issues during dialog mount
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    if (open && reflinkCode) {
      // Delay iframe load by 100ms to let dialog fully mount first
      const timer = setTimeout(() => {
        setIframeSrc(`/auth?ref=${reflinkCode}&preview=true`);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIframeSrc(null);
    }
  }, [open, reflinkCode]);

  const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
        <div className="flex-1 border rounded-lg overflow-hidden bg-background">
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title="Podgląd strony rejestracji"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Kluczowe zmiany

| Element | Opis |
|---------|------|
| `onFocusOutside={(e) => e.preventDefault()}` | **GŁÓWNA NAPRAWA** - zapobiega zamknięciu gdy focus przechodzi do iframe |
| `onEscapeKeyDown={(e) => e.preventDefault()}` | Użytkownik musi kliknąć X aby zamknąć (nie przez Escape podczas ładowania) |
| Opóźnione ładowanie iframe | 100ms delay pozwala dialogowi w pełni się zamontować zanim iframe zacznie ładować i walczyć o focus |
| Loader podczas ładowania | Użytkownik widzi animację zamiast pustego miejsca |

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/user-reflinks/ReflinkPreviewDialog.tsx` | Pełna przebudowa z `onFocusOutside`, `onEscapeKeyDown` i opóźnionym ładowaniem iframe |

---

## Oczekiwany efekt

1. Kliknięcie ikony oka otwiera dialog
2. Dialog pokazuje loader przez 100ms
3. Iframe zaczyna się ładować dopiero gdy dialog jest stabilny
4. Dialog **NIE zamyka się** gdy iframe ładuje stronę
5. Dialog **NIE zamyka się** gdy użytkownik kliknie w iframe
6. Dialog zamyka się **TYLKO** przez kliknięcie przycisku X
7. Użytkownik widzi formularz rejestracji z danymi z PureLinku
