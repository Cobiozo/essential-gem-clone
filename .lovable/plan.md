
# Plan: Zmiana WidgetInfoButton z hover na kliknięcie

## Problem

Obecnie ikonka "i" przy widżetach pokazuje opis po najechaniu myszką (z 3-sekundowym opóźnieniem). Użytkownik chce, żeby opis pojawiał się **po kliknięciu**.

## Rozwiązanie

Zamiana komponentu `Tooltip` na `Popover` - który otwiera się po kliknięciu zamiast najechania.

---

## Zmiany techniczne

### Plik `src/components/dashboard/WidgetInfoButton.tsx`

**Przed (Tooltip - hover):**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

<Tooltip delayDuration={3000}>
  <TooltipTrigger asChild>
    <button>...</button>
  </TooltipTrigger>
  <TooltipContent>
    {description}
  </TooltipContent>
</Tooltip>
```

**Po (Popover - kliknięcie):**
```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild>
    <button>...</button>
  </PopoverTrigger>
  <PopoverContent side="bottom" align="end" className="max-w-[200px] text-xs p-3">
    {description}
  </PopoverContent>
</Popover>
```

---

## Podsumowanie

| Plik | Zmiana |
|------|--------|
| `WidgetInfoButton.tsx` | Zamiana `Tooltip` na `Popover` |

## Oczekiwany rezultat

- Kliknięcie w ikonkę "i" otwiera dymek z opisem widżetu
- Kolejne kliknięcie (lub kliknięcie poza dymek) zamyka go
- Najechanie myszką nie pokazuje już opisu
- Działa na urządzeniach mobilnych (gdzie hover nie istnieje)
