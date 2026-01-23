
# Plan: Zachowanie stanu edycji przy przełączaniu kart przeglądarki

## Diagnoza problemu

Po przeanalizowaniu kodu zidentyfikowałem główne przyczyny automatycznego "ucieku" z edycji reflinków do panelu CMS:

### Przyczyna 1: Hook `useAdminPresence` z zależnością od `activeTab`

W pliku `src/pages/Admin.tsx` (linia 281-286):
```javascript
const { admins, currentUserPresence, isConnected, updateActivity } = useAdminPresence(activeTab);

useEffect(() => {
  updateActivity(activeTab);
}, [activeTab, updateActivity]);
```

Hook `useAdminPresence` nasłuchuje na zdarzenie `visibilitychange` (linia 102-111 w `useAdminPresence.ts`):
```javascript
const handleVisibilityChange = () => {
  isTabVisible = !document.hidden;
  
  if (isTabVisible && channelRef.current && mountedRef.current) {
    trackPresence();
  }
};
```

Gdy użytkownik wraca na kartę, `trackPresence()` jest wywoływane z aktualnym `activeTab`, co może powodować re-render całego komponentu Admin.

### Przyczyna 2: Hook `useNotifications` wywołuje `fetchUnreadCount()` przy powrocie

```javascript
const handleVisibilityChange = () => {
  if (!document.hidden) {
    fetchUnreadCount();
    startPolling();
  }
};
```

### Przyczyna 3: Dialogi w `ReflinksManagement` tracą stan przy re-renderze

Komponent `ReflinksManagement` używa lokalnego stanu `showAddDialog` i `editingReflink`, które mogą zostać zresetowane przy re-renderze rodzica (`Admin.tsx`).

### Przyczyna 4: Możliwy inactivity timeout

Jeśli admin jest na innej karcie dłużej niż 30 minut, hook `useInactivityTimeout` wymusza wylogowanie i przekierowanie do `/auth`.

---

## Rozwiązanie

### Krok 1: Blokada aktualizacji stanu przy ukrytej karcie

Utworzyć globalny hook `usePageVisibility` który śledzi widoczność strony i pozwala komponentom decydować czy mają aktualizować stan.

**Nowy plik: `src/hooks/usePageVisibility.ts`**

```typescript
import { useState, useEffect, createContext, useContext } from 'react';

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible;
};
```

### Krok 2: Modyfikacja `useAdminPresence` - nie wywoływać re-render

Zmodyfikować hook aby nie powodował re-renderów przy powrocie na kartę:

```typescript
// Nie wywołuj setState w handleVisibilityChange
// Tylko aktualizuj presence na serwerze bez wpływu na UI
const handleVisibilityChange = () => {
  isTabVisible = !document.hidden;
  
  if (isTabVisible && channelRef.current && mountedRef.current) {
    // Użyj setTimeout aby odłożyć aktualizację i uniknąć natychmiastowego re-rendera
    setTimeout(() => {
      if (mountedRef.current) trackPresence();
    }, 100);
  }
};
```

### Krok 3: Modyfikacja `useNotifications` - opóźnione odświeżanie

```typescript
const handleVisibilityChange = () => {
  if (document.hidden) {
    stopPolling();
  } else {
    // Opóźnij odświeżanie o 500ms aby nie blokować UI
    setTimeout(() => {
      if (!document.hidden) {
        fetchUnreadCount();
        startPolling();
      }
    }, 500);
  }
};
```

### Krok 4: Stabilizacja stanu dialogów w ReflinksManagement

Użyć `useRef` dla krytycznych stanów dialogów aby przetrwały re-rendery:

```typescript
// Zamiast
const [showAddDialog, setShowAddDialog] = useState(false);

// Użyj kombinacji state + ref dla bezpieczeństwa
const dialogStateRef = useRef({ showAdd: false, editing: null });
const [showAddDialog, setShowAddDialog] = useState(false);

// Aktualizuj ref przy każdej zmianie
useEffect(() => {
  dialogStateRef.current.showAdd = showAddDialog;
}, [showAddDialog]);
```

### Krok 5: Dodanie flagi "editing mode" w Admin.tsx

Dodać globalną flagę która blokuje niektóre aktualizacje gdy admin jest w trybie edycji:

```typescript
const [isEditingMode, setIsEditingMode] = useState(false);

// W useEffect dla presence - sprawdź flagę
useEffect(() => {
  if (!isEditingMode) {
    updateActivity(activeTab);
  }
}, [activeTab, updateActivity, isEditingMode]);
```

### Krok 6: Przekazanie flagi do komponentów potomnych

`ReflinksManagement` będzie informować `Admin` o trybie edycji:

```typescript
<ReflinksManagement 
  onEditingStateChange={(isEditing) => setIsEditingMode(isEditing)} 
/>
```

---

## Szczegóły techniczne

### Zmiany w plikach:

| Plik | Zmiana |
|------|--------|
| `src/hooks/usePageVisibility.ts` | Nowy hook |
| `src/hooks/useAdminPresence.ts` | Opóźnienie aktualizacji przy powrocie |
| `src/hooks/useNotifications.ts` | Opóźnienie odświeżania |
| `src/pages/Admin.tsx` | Flaga `isEditingMode` blokująca aktualizacje |
| `src/components/admin/ReflinksManagement.tsx` | Callback `onEditingStateChange` |

### Logika działania:

```text
Użytkownik otwiera dialog "Dodaj reflink"
  ↓
ReflinksManagement wywołuje onEditingStateChange(true)
  ↓
Admin.tsx ustawia isEditingMode = true
  ↓
Użytkownik przełącza się na inną kartę
  ↓
visibilitychange wykrywane, ale:
  - useAdminPresence opóźnia aktualizację
  - useNotifications opóźnia fetch
  - Admin.tsx NIE resetuje stanu gdy isEditingMode = true
  ↓
Użytkownik wraca na kartę
  ↓
Dialog pozostaje otwarty z danymi
  ↓
Po 500ms - delikatne odświeżenie danych w tle (bez wpływu na dialogi)
```

---

## Alternatywne podejście: Page Visibility Guard

Komponent wrapper który całkowicie blokuje re-rendery potomków gdy strona jest ukryta:

```typescript
const StableEditingContext = React.memo(({ children }) => {
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        setFrozenAt(Date.now());
      } else {
        setFrozenAt(null);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Freeze children rendering when hidden
  return frozenAt ? null : children;
});
```

---

## Podsumowanie implementacji

1. **Nowy hook**: `usePageVisibility` - śledzenie widoczności
2. **Modyfikacja**: `useAdminPresence` - opóźnione aktualizacje
3. **Modyfikacja**: `useNotifications` - opóźnione odświeżanie  
4. **Modyfikacja**: `Admin.tsx` - flaga `isEditingMode`
5. **Modyfikacja**: `ReflinksManagement.tsx` - callback informujący o trybie edycji
6. **Opcjonalnie**: Hook `useStableState` dla krytycznych dialogów

Ta implementacja gwarantuje że:
- Dialogi edycji pozostają otwarte przy przełączaniu kart
- Dane w formularzach nie są tracone
- Aktualizacje w tle są opóźnione i nie zakłócają UI
- Administrator musi jawnie zamknąć dialog lub zapisać zmiany
