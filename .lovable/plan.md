

# Plan: Definitywna naprawa dialogu podglądu PureLink

## Diagnoza problemu

Problem polega na tym, że Radix Dialog wywoluje `onOpenChange(false)` mimo dodania `preventDefault()` na eventach. Te handlery blokuja konkretne zdarzenia (klikniecie, focus), ale Radix moze nadal wewnetrznie wywolac `onOpenChange(false)` z innych powodow (np. podczas montowania iframe).

W `UserReflinksPanel.tsx` (linia 408):
```tsx
onOpenChange={(open) => !open && setPreviewReflink(null)}
```

Gdy Radix wywola `onOpenChange(false)`, `previewReflink` jest ustawiany na `null`, co zamyka dialog.

---

## Rozwiazanie

### Strategia: Wlasna kontrola zamykania dialogu

Zamiast polegac na `onOpenChange` do zamykania, uzyjemy wlasnej logiki:

1. **Ignoruj `onOpenChange(false)`** - dialog bedzie kontrolowany wylacznie przez nasz stan
2. **Dodaj wlasny przycisk X** - ktory explicite zamknie dialog
3. **Ukryj domyslny przycisk X Radix** - uzyj `hideCloseButton` prop

---

## Zmiany w kodzie

### Plik 1: `src/components/user-reflinks/ReflinkPreviewDialog.tsx`

**Zmiany:**
1. Dodac wlasna funkcje `handleClose` ktora kontroluje zamkniecie
2. Zmodyfikowac `onOpenChange` aby ignorowalo automatyczne zamkniecie
3. Dodac wlasny przycisk X obok przycisku "Otworz w nowej karcie"
4. Uzyc `hideCloseButton` aby ukryc domyslny X

```tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, X } from 'lucide-react';

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
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    if (open && reflinkCode) {
      const timer = setTimeout(() => {
        setIframeSrc(`/auth?ref=${reflinkCode}&preview=true`);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIframeSrc(null);
    }
  }, [open, reflinkCode]);

  // Explicite zamkniecie - JEDYNY sposob na zamkniecie dialogu
  const handleClose = () => {
    onOpenChange(false);
  };

  // Blokuj automatyczne zamykanie - dialog zamyka sie TYLKO przez handleClose
  const handleOpenChange = (newOpen: boolean) => {
    // Ignoruj proby zamkniecia (newOpen === false)
    // Dialog moze byc tylko otwarty przez rodzica, zamkniety przez handleClose
    if (newOpen === true) {
      // Pozwol na otwarcie (choc to i tak kontrolowane przez prop open)
    }
    // NIE wywoluj onOpenChange(false) automatycznie
  };

  const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Podglad strony rejestracji</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fullUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Otworz w nowej karcie
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Zamknij</span>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 border rounded-lg overflow-hidden bg-background">
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title="Podglad strony rejestracji"
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
| `handleOpenChange` | Ignoruje `onOpenChange(false)` - blokuje automatyczne zamykanie |
| `handleClose` | Jedyny sposob na zamkniecie dialogu - wywolywany przez przycisk X |
| `hideCloseButton` | Ukrywa domyslny przycisk X z Radix (ktory wywoluje wewnetrzne `onOpenChange`) |
| Wlasny przycisk X | Dodany obok "Otworz w nowej karcie" - wywoluje `handleClose` |

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/user-reflinks/ReflinkPreviewDialog.tsx` | Dodanie wlasnej kontroli zamykania z `hideCloseButton` i wlasnym przyciskiem X |

---

## Oczekiwany efekt

1. Klikniecie ikony oka otwiera dialog
2. Dialog pokazuje loader przez 100ms
3. Iframe zaczyna sie ladowac
4. Dialog **NIE zamyka sie** automatycznie - zadne wewnetrzne mechanizmy Radix nie moga go zamknac
5. Dialog zamyka sie **TYLKO** przez klikniecie wlasnego przycisku X w prawym gornym rogu
6. Uzytkownik widzi formularz rejestracji z danymi z PureLinku

