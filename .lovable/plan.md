

# Miniaturki obrazków w czacie + podgląd z opcjami

## Problem
Obrazki w czacie zajmują całe okno PiP/sidebar (max-w-[280px] to za dużo). Kliknięcie otwiera nową kartę zamiast podglądu z akcjami.

## Rozwiązanie

### 1. Zmniejszenie miniaturek w `MessageBubble.tsx`
- Zmiana `max-w-[280px]` na `max-w-[120px]` (mały thumbnail)
- Dodanie `max-h-[120px] object-cover` żeby zachować proporcje

### 2. Dialog podglądu obrazka w `MessageBubble.tsx`
Zamiast `window.open()` na kliknięcie, otworzy się wbudowany dialog (shadcn `Dialog`) z:
- Dużym podglądem obrazka (object-contain, pełna szerokość dialogu)
- Przycisk **"Przekaż"** — użyje `navigator.share()` na mobile lub skopiuje URL na desktop
- Przycisk **"Zapisz na urządzeniu"** — użyje istniejącego `shareOrDownloadImage()` z `imageShareUtils.ts`

### 3. Struktura nowego dialogu

```text
┌─────────────────────────────┐
│         Podgląd obrazka   ✕ │
│                             │
│    ┌───────────────────┐    │
│    │                   │    │
│    │   duży obrazek    │    │
│    │   object-contain  │    │
│    │                   │    │
│    └───────────────────┘    │
│                             │
│  [  Przekaż  ] [ Zapisz  ] │
└─────────────────────────────┘
```

### Plik do edycji
- `src/components/unified-chat/MessageBubble.tsx` — dodanie stanu `previewImage`, zmniejszenie thumbnail, dodanie dialogu z przyciskami wykorzystującymi `shareOrDownloadImage` i `navigator.share`

### Reużycie
- `shareOrDownloadImage` z `src/lib/imageShareUtils.ts` — obsługuje mobile (Web Share API → galeria) i desktop (blob download)
- Nie tworzymy nowego komponentu — dialog jest prosty, wystarczy stan + shadcn Dialog w tym samym pliku

