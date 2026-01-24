
# Stabilizacja Widoku Struktury Organizacji

## Problem
Widok "Struktura" ciągle mruga i pokazuje "Ładowanie struktury..." w nieskończoność. Jest to spowodowane **pętlą nieskończonych odświeżeń**.

## Diagnoza techniczna

```text
Pętla błędu:
1. useOrganizationTreeSettings tworzy funkcje canAccessTree() i getMaxDepthForRole()
2. Te funkcje NIE są memoizowane (brak useCallback)
3. Każdy render tworzy NOWE referencje funkcji
4. useOrganizationTree używa tych funkcji w zależnościach fetchTree (useCallback)
5. fetchTree zmienia się → useEffect wywołuje fetchTree()
6. fetchTree ustawia setLoading(true) → re-render → powtórz od kroku 1
```

## Rozwiązanie

### 1. Memoizacja funkcji w `useOrganizationTreeSettings.ts`

Zmiana funkcji `canAccessTree` i `getMaxDepthForRole` na memoizowane wersje z `useCallback`:

```typescript
// PRZED (powoduje pętlę):
const canAccessTree = (): boolean => {
  if (!settings || !settings.is_enabled) return false;
  // ...
};

// PO (stabilne):
const canAccessTree = useCallback((): boolean => {
  if (!settings || !settings.is_enabled) return false;
  // ...
}, [settings, userRole?.role]);
```

### 2. Dodanie `useRef` do śledzenia stanu inicjalizacji w `useOrganizationTree.ts`

Zapobiegnie to wielokrotnemu wywołaniu fetch podczas inicjalizacji:

```typescript
const hasFetchedRef = useRef(false);

useEffect(() => {
  if (!hasFetchedRef.current && profile?.eq_id && !settingsLoading) {
    hasFetchedRef.current = true;
    fetchTree();
  }
}, [profile?.eq_id, settingsLoading, fetchTree]);
```

### 3. Usunięcie niestabilnych zależności z `useCallback`

W `useOrganizationTree.ts`, funkcje `canAccessTree` i `getMaxDepthForRole` będą wywoływane wewnątrz callbacka bez dodawania ich do zależności (używając zamknięcia):

```typescript
const fetchTree = useCallback(async () => {
  if (!profile?.eq_id || settingsLoading) return;
  
  // Wywołaj funkcje wewnątrz - nie jako zależności
  if (!canAccessTree()) {
    setLoading(false);
    return;
  }
  
  const maxDepth = getMaxDepthForRole();
  // ...
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, settings?.show_upline]);
// ^ Usunięto: canAccessTree, getMaxDepthForRole z zależności
```

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useOrganizationTreeSettings.ts` | Dodanie `useCallback` do `canAccessTree` i `getMaxDepthForRole` |
| `src/hooks/useOrganizationTree.ts` | Dodanie `useRef` dla kontroli inicjalizacji + usunięcie niestabilnych zależności |

## Oczekiwany rezultat

- Widok ładuje się **tylko raz** przy wejściu na zakładkę
- Brak mrugania i nieskończonego "Ładowanie struktury..."
- Dane wyświetlają się stabilnie po jednorazowym pobraniu

## Szczegóły techniczne

### Zmiana w `useOrganizationTreeSettings.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';

// ...

const canAccessTree = useCallback((): boolean => {
  if (!settings || !settings.is_enabled) return false;
  
  const role = userRole?.role;
  if (!role) return false;
  
  if (role === 'admin') return true;
  if (role === 'partner' && settings.visible_to_partners) return true;
  if (role === 'specjalista' && settings.visible_to_specjalista) return true;
  if (role === 'client' && settings.visible_to_clients) return true;
  
  return false;
}, [settings, userRole?.role]);

const getMaxDepthForRole = useCallback((): number => {
  if (!settings) return 0;
  
  const role = userRole?.role;
  if (!role) return 0;
  
  if (role === 'admin') return settings.max_depth;
  if (role === 'partner') return settings.partner_max_depth;
  if (role === 'specjalista') return settings.specjalista_max_depth;
  if (role === 'client') return settings.client_max_depth;
  
  return 0;
}, [settings, userRole?.role]);
```

### Zmiana w `useOrganizationTree.ts`:

```typescript
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ...

const hasFetchedRef = useRef(false);

const fetchTree = useCallback(async () => {
  if (!profile?.eq_id || settingsLoading) return;
  
  if (!canAccessTree()) {
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const maxDepth = getMaxDepthForRole();
    // ... reszta kodu bez zmian
  }
}, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, settings?.show_upline, canAccessTree, getMaxDepthForRole]);

useEffect(() => {
  // Pobierz tylko raz po załadowaniu ustawień
  if (!settingsLoading && profile?.eq_id && !hasFetchedRef.current) {
    hasFetchedRef.current = true;
    fetchTree();
  }
}, [settingsLoading, profile?.eq_id, fetchTree]);
```

Alternatywnie, można użyć prostszego podejścia z pojedynczym `useEffect` który sprawdza wszystkie warunki:

```typescript
useEffect(() => {
  if (!profile?.eq_id || settingsLoading) return;
  
  const loadData = async () => {
    if (!canAccessTree()) {
      setLoading(false);
      return;
    }
    // ... fetch logic
  };
  
  loadData();
}, [profile?.eq_id, settingsLoading]); // Minimalne zależności
```
