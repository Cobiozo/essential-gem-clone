
# Plan: Automatyczne otwieranie dropdown avatara dla kroków 11 i 12

## Problem
Dla kroków 11 (Moje Konto) i 12 (Panel narzędziowy) samouczka, menu rozwijane avatara w prawym górnym rogu powinno się automatycznie otworzyć, aby podświetlić elementy "Moje konto" i "Panel narzędziowy". Obecnie:
- `TourOverlay` wywołuje `onDropdownToggle(true)` gdy krok wymaga otwartego dropdown
- Ale callback nie jest podłączony - `OnboardingTour` w Dashboard.tsx nie ma przekazanych propsów
- `DashboardTopbar` używa niekontrolowanego `DropdownMenu` bez zewnętrznego stanu

---

## Rozwiązanie

### Architektura przepływu danych

```text
Dashboard.tsx
     │
     ├── DashboardLayout
     │        │
     │        └── DashboardTopbar
     │                 │
     │                 └── DropdownMenu (kontrolowany przez isUserMenuOpen)
     │
     └── OnboardingTour
              │
              └── TourOverlay (wywołuje onDropdownToggle)
```

Musimy przekazać callback z `DashboardTopbar` przez `DashboardLayout` do `OnboardingTour`.

---

## Szczegóły implementacji

### Krok 1: Modyfikacja `DashboardTopbar.tsx`

Dodać kontrolowany stan dla dropdown menu avatara:

```typescript
interface DashboardTopbarProps {
  title?: string;
  isUserMenuOpen?: boolean;
  onUserMenuOpenChange?: (open: boolean) => void;
}

// W komponencie:
const [internalOpen, setInternalOpen] = useState(false);
const isOpen = isUserMenuOpen !== undefined ? isUserMenuOpen : internalOpen;
const handleOpenChange = (open: boolean) => {
  setInternalOpen(open);
  onUserMenuOpenChange?.(open);
};

// W DropdownMenu:
<DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
```

Dodać również atrybut `data-tour="user-avatar"` do przycisku avatara.

---

### Krok 2: Modyfikacja `DashboardLayout.tsx`

Przekazać propsy do `DashboardTopbar`:

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  isUserMenuOpen?: boolean;
  onUserMenuOpenChange?: (open: boolean) => void;
}

// W komponencie:
<DashboardTopbar 
  title={title} 
  isUserMenuOpen={isUserMenuOpen}
  onUserMenuOpenChange={onUserMenuOpenChange}
/>
```

---

### Krok 3: Modyfikacja `Dashboard.tsx`

Dodać stan do zarządzania dropdown i przekazać callback do `OnboardingTour`:

```typescript
const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

const handleDropdownToggle = useCallback((open: boolean) => {
  setIsUserMenuOpen(open);
}, []);

// W render:
<DashboardLayout 
  title={t('dashboard.menu.dashboard')}
  isUserMenuOpen={isUserMenuOpen}
  onUserMenuOpenChange={setIsUserMenuOpen}
>
  {/* ... widgets ... */}
  
  <OnboardingTour onDropdownToggle={handleDropdownToggle} />
</DashboardLayout>
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/DashboardTopbar.tsx` | Dodanie kontrolowanego stanu dropdown z propsami `isUserMenuOpen` i `onUserMenuOpenChange` |
| `src/components/dashboard/DashboardLayout.tsx` | Przekazanie propsów dropdown do `DashboardTopbar` |
| `src/pages/Dashboard.tsx` | Dodanie stanu `isUserMenuOpen` i przekazanie `onDropdownToggle` do `OnboardingTour` |

---

## Diagram przepływu

```text
KROK 11 SAMOUCZKA (Moje Konto)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TourOverlay wykrywa step.requiresDropdownOpen = true
                    │
                    ▼
2. Wywołuje onDropdownToggle(true)
                    │
                    ▼
3. Dashboard otrzymuje callback → setIsUserMenuOpen(true)
                    │
                    ▼
4. DashboardLayout przekazuje isUserMenuOpen=true do DashboardTopbar
                    │
                    ▼
5. DropdownMenu otwiera się automatycznie
                    │
                    ▼
6. Element [data-tour="user-menu-account"] staje się widoczny
                    │
                    ▼
7. TourOverlay podświetla element i pokazuje tooltip

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Oczekiwany rezultat

1. Gdy samouczek dochodzi do kroku 11 (Moje Konto), avatar dropdown automatycznie się otwiera
2. Element "Moje konto" w menu jest podświetlony ramką i tooltip wyjaśnia funkcję
3. Gdy użytkownik klika "Dalej", dropdown pozostaje otwarty dla kroku 12
4. Element "Panel narzędziowy" jest podświetlony
5. Gdy użytkownik przechodzi do kroku 13, dropdown automatycznie się zamyka
6. Użytkownik może też ręcznie zamknąć/otworzyć dropdown podczas samouczka
