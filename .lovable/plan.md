
# Plan naprawy: Tooltips i ikony informacyjne

## Zidentyfikowane problemy

Na podstawie screenshotu i analizy kodu:

1. **Tooltip w sidebarze pojawia się natychmiast** - `SidebarMenuButton` ma wbudowany prop `tooltip={t(item.labelKey)}` (linia 611), który wyświetla tooltip natychmiast, mimo że jest opakowany w `Tooltip` z `delayDuration={2000}`

2. **Informacja widżetu pokazuje się natychmiast** - `WidgetInfoButton` używa `Popover` (wyświetla się przy kliknięciu), ale użytkownik oczekuje opóźnionego tooltipa przy najechaniu (3 sekundy)

3. **Kolizja wizualna** - Ikona "i" w lewym górnym rogu (top-2 left-2) koliduje z tooltipem, który też pojawia się w tej okolicy

---

## Rozwiązanie

### Zmiana 1: Usunięcie podwójnego tooltipa w sidebarze

**Plik: `src/components/dashboard/DashboardSidebar.tsx`**

Usunąć prop `tooltip` z `SidebarMenuButton` wewnątrz `Tooltip` wrappera:

```tsx
// BYŁO (linia 608-616):
<SidebarMenuButton
  onClick={() => handleMenuClick(item)}
  isActive={isActive(item)}
  tooltip={t(item.labelKey)}  // ← TO POWODUJE NATYCHMIASTOWY TOOLTIP
  className="..."
>

// BĘDZIE:
<SidebarMenuButton
  onClick={() => handleMenuClick(item)}
  isActive={isActive(item)}
  // tooltip usunięty - używamy zewnętrznego Tooltip z delayDuration
  className="..."
>
```

Zmienić opóźnienie z 2000ms na 3000ms:
```tsx
<Tooltip delayDuration={3000}>
```

Zmniejszyć tekst tooltipa:
```tsx
<TooltipContent side="right" className="max-w-xs text-xs">
```

### Zmiana 2: Przebudowa WidgetInfoButton na Tooltip z opóźnieniem

**Plik: `src/components/dashboard/WidgetInfoButton.tsx`**

Zmienić z `Popover` (kliknięcie) na `Tooltip` z opóźnieniem 3 sekund przy najechaniu:

```tsx
import React from 'react';
import { Info } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface WidgetInfoButtonProps {
  description: string;
}

export const WidgetInfoButton: React.FC<WidgetInfoButtonProps> = ({ description }) => {
  return (
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <button
          className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="Informacja o widżecie"
        >
          <Info className="h-3 w-3 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        align="end" 
        className="max-w-[200px] text-xs"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
};
```

**Kluczowe zmiany:**
- `Popover` → `Tooltip` z `delayDuration={3000}` (3 sekundy)
- Pozycja: `top-2 left-2` → `top-2 right-2` (prawy górny róg, z dala od tytułu)
- Tooltip wyświetla się `side="bottom"` (pod ikoną, nie obok)
- Tekst: `text-sm` → `text-xs` (mniejszy)
- Szerokość: `w-64` → `max-w-[200px]` (węższa)

---

## Wizualizacja po zmianach

**Sidebar - tooltip z 3s opóźnieniem:**
```text
┌──────────────────┐     
│ 📊 Pulpit        │ ─(po 3s)─► ┌──────────────────────────────┐
│ 🎓 Akademia      │            │ Twoja strona główna z        │
│ 💚 Zdrowa Wiedza │            │ podglądem wszystkich info... │
│ 📁 Biblioteka    │            └──────────────────────────────┘
└──────────────────┘
```

**Widżet - ikona "i" w prawym rogu, tooltip pod spodem:**
```text
┌─────────────────────────────────────────(i)┐
│    📅 Kalendarz wydarzeń         [Zobacz ►]│
│    ┌─────────────────────────────────────┐ │
│    │ Pn Wt Śr Cz Pt Sb Nd               │ │
│    │  ...                               │ │
│    └─────────────────────────────────────┘ │
└────────────────────────────────────────────┘

Po najechaniu na (i) i odczekaniu 3s:
                              ┌────────────────────┐
                              │ Kalendarz wydarzeń │
                              │ - kliknij dzień... │
                              └────────────────────┘
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/DashboardSidebar.tsx` | Usunięcie prop `tooltip` z SidebarMenuButton, zmiana delayDuration na 3000, mniejszy tekst |
| `src/components/dashboard/WidgetInfoButton.tsx` | Popover → Tooltip, delayDuration=3000, pozycja top-2 right-2, mniejszy tekst |

---

## Sekcja techniczna

### Szczegóły zmian w DashboardSidebar.tsx

**Linia 606:**
```tsx
// Zmiana opóźnienia
<Tooltip delayDuration={3000}>
```

**Linie 608-616:**
```tsx
// Usunięcie prop tooltip
<SidebarMenuButton
  onClick={() => handleMenuClick(item)}
  isActive={isActive(item)}
  className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
>
```

**Linia 619:**
```tsx
// Mniejszy tekst
<TooltipContent side="right" className="max-w-xs text-xs">
```

### Szczegóły zmian w WidgetInfoButton.tsx

Pełna zamiana komponentu na Tooltip-based zamiast Popover-based:
- Import: `Tooltip, TooltipContent, TooltipTrigger` zamiast `Popover, PopoverContent, PopoverTrigger`
- Pozycja przycisku: `top-2 right-2` (prawy górny róg)
- Tooltip: `delayDuration={3000}`, `side="bottom"`, `align="end"`
- Styl tekstu: `text-xs`, `max-w-[200px]`
