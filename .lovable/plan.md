
# Plan: Naprawa problemów z wersją mobilną

## Zdiagnozowane problemy

Na podstawie analizy kodu zidentyfikowałem **4 główne przyczyny** problemów mobilnych:

### Problem 1: Collapsible nie zwija się ponownie
**Przyczyna**: W `DashboardSidebar.tsx` logika sterowania podmenu uniemożliwia zamknięcie sekcji, gdy użytkownik jest na aktywnej podstronie:

```typescript
// Linia 577 - jeśli isSubmenuParentActive() = true, sekcja jest ZAWSZE otwarta
open={openSubmenu === item.id || isSubmenuParentActive(item)}
```

Gdy użytkownik wchodzi np. do "Webinary" (podmenu "Wydarzenia"), sekcja `isSubmenuParentActive` zwraca `true`, co **wymusza** otwarcie i ignoruje próby zwinięcia.

### Problem 2: Kliknięcia nie reagują / wymaga odświeżenia
**Przyczyna 1**: `SidebarMenuSubButton` używa elementu `<a>` zamiast `<button>`, ale w kodzie sidebar przekazujemy `onClick` bez `href`:

```typescript
// DashboardSidebar.tsx:597-598
<SidebarMenuSubButton onClick={() => handleSubmenuClick(subItem)} ...>
```

Element `<a>` bez `href` może mieć problemy z obsługą zdarzeń dotykowych na iOS.

**Przyczyna 2**: Blokowanie zdarzeń w dialogach startowych (`onPointerDownOutside: e.preventDefault()`) może pozostawiać "martwy" overlay, jeśli zamknięcie bannera nie powiedzie się.

### Problem 3: Zawieszanie się aplikacji
**Przyczyna**: Kosztowne operacje w `useEffect` w `TrainingModule.tsx`:
- Synchronizacja localStorage dla wszystkich lekcji przy każdym wejściu
- Sekwencyjne zapytania do bazy danych
- Brak debounce'ingu i throttlingu

### Problem 4: Konflikt touch-action w CSS
**Przyczyna**: Globalna reguła `touch-action: manipulation` na `[data-state]` może kolidować z animacjami Collapsible Radix UI.

---

## Rozwiązania

### Zmiana 1: Naprawa logiki zwijania Collapsible w sidebarze

**Plik**: `src/components/dashboard/DashboardSidebar.tsx`

Zmienić logikę sterowania tak, aby użytkownik mógł **ręcznie zwinąć** podmenu nawet gdy jest na aktywnej podstronie:

```typescript
// PRZED (linia 577):
open={openSubmenu === item.id || isSubmenuParentActive(item)}

// PO - dodać osobny stan do kontroli ręcznego zamknięcia:
const [manuallyClosedSubmenu, setManuallyClosedSubmenu] = useState<string | null>(null);

// Logika: otwarte jeśli ręcznie otwarte LUB (aktywne I nie zamknięte ręcznie)
const isSubmenuOpen = (item: MenuItem) => {
  if (openSubmenu === item.id) return true;
  if (manuallyClosedSubmenu === item.id) return false;
  return isSubmenuParentActive(item);
};

// W onOpenChange:
onOpenChange={(open) => {
  if (open) {
    setOpenSubmenu(item.id);
    setManuallyClosedSubmenu(null);
  } else {
    setOpenSubmenu(null);
    setManuallyClosedSubmenu(item.id);
  }
}}
```

### Zmiana 2: Zamiana elementu `<a>` na `<button>` dla subbutton z onClick

**Plik**: `src/components/ui/sidebar.tsx`

Zmienić `SidebarMenuSubButton` aby używał `<button>` gdy brak `href`:

```typescript
const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  (React.ComponentProps<"button"> | React.ComponentProps<"a">) & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({ asChild = false, size = "md", isActive, className, onClick, ...props }, ref) => {
  // Jeśli ma onClick bez href - użyj button
  const hasOnlyClick = onClick && !('href' in props);
  const Comp = asChild ? Slot : (hasOnlyClick ? "button" : "a");
  
  return (
    <Comp
      ref={ref as any}
      type={hasOnlyClick ? "button" : undefined}
      onClick={onClick}
      // ... reszta props
    />
  );
});
```

### Zmiana 3: Dodanie touch-specific CSS dla lepszej responsywności

**Plik**: `src/index.css`

Dodać dedykowane style dla urządzeń dotykowych:

```css
/* Lepsze zachowanie Collapsible na mobile */
@media (hover: none) and (pointer: coarse) {
  /* Wyłącz problematyczne animacje na iOS */
  [data-state="open"], [data-state="closed"] {
    /* Zachowaj touch-action ale nie blokuj animacji Radix */
  }
  
  /* Zwiększ obszar dotykowy dla CollapsibleTrigger */
  [data-radix-collapsible-trigger] {
    min-height: 48px;
    padding: 12px;
  }
  
  /* Aktywny feedback dotykowy */
  button:active, a:active, [role="button"]:active {
    opacity: 0.7;
    transition: opacity 0.1s;
  }
}
```

### Zmiana 4: Reset ręcznego zamknięcia przy zmianie ścieżki

**Plik**: `src/components/dashboard/DashboardSidebar.tsx`

Dodać efekt resetujący stan `manuallyClosedSubmenu` przy nawigacji:

```typescript
// Reset przy zmianie lokacji - użytkownik przeszedł do nowej strony
useEffect(() => {
  setManuallyClosedSubmenu(null);
}, [location.pathname]);
```

### Zmiana 5: Optymalizacja bannerów startowych

**Plik**: `src/components/ImportantInfoBanner.tsx` i `DailySignalBanner.tsx`

Dodać timeout bezpieczeństwa dla zamykania dialogu:

```typescript
const handleDismiss = async () => {
  // Natychmiast zamknij UI, potem synchronizuj z bazą
  setShowBanner(false);
  onDismiss();
  
  // Asynchronicznie zapisz do bazy
  try {
    await supabase.from('user_dismissed_banners').upsert({...});
  } catch (error) {
    console.error('Error saving dismissal:', error);
    // Nie blokuj UI - banner już zamknięty
  }
};
```

---

## Szczegółowa tabela zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `src/components/dashboard/DashboardSidebar.tsx` | Dodać `manuallyClosedSubmenu` state + logikę `isSubmenuOpen()` | Umożliwić ręczne zwijanie podmenu |
| `src/components/dashboard/DashboardSidebar.tsx` | Reset stanu przy `location.pathname` | Czysta nawigacja po zmianie strony |
| `src/components/ui/sidebar.tsx` | `SidebarMenuSubButton` - użyć `<button>` gdy tylko `onClick` | Poprawna obsługa touch na iOS |
| `src/index.css` | Dodać media query `(hover: none)` z min-height dla triggerów | Większy obszar dotykowy |
| `src/components/ImportantInfoBanner.tsx` | Zamknąć dialog PRZED zapisem do bazy | Natychmiastowa reakcja UI |
| `src/components/DailySignalBanner.tsx` | Zamknąć dialog PRZED zapisem do bazy | Natychmiastowa reakcja UI |

---

## Oczekiwane rezultaty

Po wdrożeniu:
1. **Podmenu w sidebarze** będzie można zwinąć ręcznie nawet będąc na aktywnej podstronie
2. **Kliknięcia w submenu** będą natychmiast reagować na urządzeniach iOS
3. **Bannery startowe** zamkną się natychmiast po kliknięciu, bez czekania na bazę danych
4. **Większy obszar dotykowy** dla elementów Collapsible na urządzeniach mobilnych
5. **Brak "zamrażania" UI** dzięki optymistycznej aktualizacji stanu

---

## Dodatkowe rekomendacje

Jeśli problemy będą się powtarzać, warto rozważyć:
- Dodanie `console.log` w kluczowych miejscach do debugowania na urządzeniu użytkownika
- Użycie React DevTools Profiler do identyfikacji kosztownych renderów
- Sprawdzenie czy problem występuje na konkretnym urządzeniu/przeglądarce (iPhone Safari vs Android Chrome)
