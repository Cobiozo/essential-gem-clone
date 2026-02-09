

# Plan: Poprawa klikalności i stabilności aplikacji na urządzeniach mobilnych

## Podsumowanie diagnozy

Analiza kodu ujawniła kilka kluczowych problemów powodujących słabą klikalność i niestabilność na urządzeniach mobilnych.

---

## Zidentyfikowane problemy

### Problem 1: Zbyt małe elementy interaktywne

**Gdzie:** `src/components/ui/tabs.tsx`, `src/components/ui/button.tsx`

**Opis:** TabsTrigger ma domyślną wysokość tylko `h-10` (40px) z paddingiem `py-1.5` (6px). Na urządzeniach dotykowych minimalna wysokość powinna wynosić 44px-48px. Przyciski w rozmiarze `sm` mają `h-9` (36px), co jest poniżej zalecanego minimum dla iOS.

---

### Problem 2: Brak touch-action na interaktywnych elementach

**Gdzie:** `src/components/ui/tabs.tsx`, `src/components/ui/button.tsx`

**Opis:** Wiele interaktywnych komponentów nie ma ustawionego `touch-action: manipulation`, co powoduje opóźnienie 300ms na iOS Safari przy kliknięciu.

---

### Problem 3: Tooltips blokujące kliknięcia

**Gdzie:** `src/components/dashboard/DashboardSidebar.tsx` (linia 709)

**Opis:** Tooltip z `delayDuration={3000}` (3 sekundy) może powodować problemy z interakcją na dotyk. Radix Tooltip na urządzeniach mobilnych może przechwytywać zdarzenia touch, uniemożliwiając normalne kliknięcie.

---

### Problem 4: Nakładki z z-index 9999 mogą blokować interakcje

**Gdzie:** `src/components/cookies/CookieConsentBanner.tsx`, `src/components/onboarding/TourOverlay.tsx`

**Opis:** CookieConsentBanner i TourOverlay używają `z-[9999]`. Jeśli te elementy są niepoprawnie zamontowane lub nie reagują na kliknięcia poprawnie, mogą blokować całą aplikację.

---

### Problem 5: ScrollArea powoduje problemy z przewijaniem

**Gdzie:** `src/components/ui/scroll-area.tsx`

**Opis:** Domyślny ScrollArea nie ma ustawionego `-webkit-overflow-scrolling: touch` dla iOS, co powoduje "przyklejanie się" przewijania.

---

### Problem 6: Re-rendery AuthContext przy zmianie widoczności karty

**Gdzie:** `src/contexts/AuthContext.tsx`

**Opis:** Przy przełączaniu kart przeglądarki lub przechodzeniu do innej aplikacji na telefonie, AuthContext może wywoływać aktualizacje stanu, co powoduje re-render całej aplikacji i "miganie" UI.

---

## Rozwiązania techniczne

### Zmiana 1: Powiększenie obszarów dotyku w TabsTrigger

**Plik:** `src/components/ui/tabs.tsx`

Dodanie większej wysokości i właściwości touch dla TabsTrigger:

```tsx
// TabsTrigger - linia 29
className={cn(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
  // Minimalna wysokość dla dotyku
  "min-h-[44px]",
  // Eliminacja 300ms delay na iOS
  "touch-action-manipulation",
  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  className,
)}
```

---

### Zmiana 2: Dodanie touch-action i min-height do Button

**Plik:** `src/components/ui/button.tsx`

Zaktualizowanie buttonVariants aby zawierały właściwości mobilne:

```tsx
// linia 8
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-action-manipulation select-none",
  // ... rest
```

---

### Zmiana 3: Wyłączenie Tooltipów na dotyk

**Plik:** `src/components/dashboard/DashboardSidebar.tsx`

Tooltips powinny być wyłączone na urządzeniach mobilnych, ponieważ hover nie działa:

```tsx
// Nowy import
import { useIsMobile } from '@/hooks/use-mobile';

// W komponencie
const isMobile = useIsMobile();

// Linia 709 - zamiast Tooltip używaj bezpośrednio SidebarMenuButton na mobile
{isMobile ? (
  <SidebarMenuButton
    onClick={() => handleMenuClick(item)}
    isActive={isActive(item)}
    className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
  >
    <item.icon className="h-4 w-4" />
    <span>{t(item.labelKey)}</span>
  </SidebarMenuButton>
) : (
  <Tooltip delayDuration={3000}>
    // ... existing tooltip content
  </Tooltip>
)}
```

---

### Zmiana 4: Klasa CSS touch-action-manipulation

**Plik:** `src/index.css`

Dodanie dedykowanej klasy utility:

```css
@layer utilities {
  .touch-action-manipulation {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
}
```

---

### Zmiana 5: Naprawienie ScrollArea dla iOS

**Plik:** `src/components/ui/scroll-area.tsx`

Dodanie właściwości iOS smooth scrolling:

```tsx
// Linia 11
<ScrollAreaPrimitive.Viewport 
  className="h-full w-full rounded-[inherit]"
  style={{ WebkitOverflowScrolling: 'touch' }}
>
```

---

### Zmiana 6: Zwiększenie obszarów dotykowych globalnie w CSS

**Plik:** `src/index.css`

Rozszerzenie istniejącej reguły @media o dodatkowe selektory:

```css
/* Linia 213-218 - rozszerzenie */
@media (hover: none) and (pointer: coarse) {
  button:not([role="switch"]), 
  a, 
  [role="button"]:not([role="switch"]),
  [data-radix-collection-item],
  [role="tab"],
  [role="menuitem"],
  [data-sidebar="menu-button"],
  [data-sidebar="menu-sub-button"] {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* Zwiększone obszary dla kart i tabów */
  [role="tablist"] [role="tab"] {
    min-height: 48px;
    padding-left: 16px;
    padding-right: 16px;
  }
  
  /* Lepsze odstępy w sidebarze */
  [data-sidebar="menu"] [data-sidebar="menu-item"] {
    margin-bottom: 4px;
  }
}
```

---

### Zmiana 7: Debounce dla aktualizacji widoczności

**Plik:** `src/contexts/AuthContext.tsx`

Problem: Szybkie przełączanie kart może powodować wielokrotne wywołania. Rozwiązanie - debounce:

```tsx
// Linia 94-101 - aktualizacja handleVisibilityChange
useEffect(() => {
  let debounceTimeout: NodeJS.Timeout | null = null;
  
  const handleVisibilityChange = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      isPageHiddenRef.current = document.hidden;
    }, 100);
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (debounceTimeout) clearTimeout(debounceTimeout);
  };
}, []);
```

---

### Zmiana 8: Poprawa SidebarMenuSubButton

**Plik:** `src/components/ui/sidebar.tsx`

Już jest poprawione - `SidebarMenuSubButton` używa `<button>` gdy ma onClick bez href. Sprawdzam czy używane poprawnie.

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/index.css` | Dodanie klasy `.touch-action-manipulation` i rozszerzenie reguł mobilnych |
| `src/components/ui/tabs.tsx` | Dodanie `min-h-[44px]` i `touch-action-manipulation` do TabsTrigger |
| `src/components/ui/button.tsx` | Dodanie `touch-action-manipulation select-none` do bazowych stylów |
| `src/components/ui/scroll-area.tsx` | Dodanie `WebkitOverflowScrolling: 'touch'` do Viewport |
| `src/components/dashboard/DashboardSidebar.tsx` | Wyłączenie Tooltipów na urządzeniach mobilnych |
| `src/contexts/AuthContext.tsx` | Debounce dla handleVisibilityChange (100ms) |

---

## Oczekiwany efekt

1. **Kliknięcia rejestrują się natychmiast** - bez 300ms opóźnienia na iOS
2. **Większe strefy dotykowe** - minimum 44px wysokości dla wszystkich interaktywnych elementów
3. **Brak blokujących Tooltipów** - na mobile wyłączone całkowicie
4. **Płynne przewijanie** - poprawione dla iOS Safari
5. **Stabilność przy przełączaniu kart** - debounce zapobiega miganiu UI
6. **Lepsza responsywność** - natychmiastowy feedback przy dotknięciu

---

## Dodatkowe zalecenia

Po wdrożeniu zmian należy przetestować:
- iOS Safari (najczęstsze problemy)
- Android Chrome
- Różne rozmiary ekranów (iPhone SE, iPhone Pro Max)
- Przełączanie kart i powrót do aplikacji
- Sidebar w dashboardzie
- Formularze rezerwacji spotkań

