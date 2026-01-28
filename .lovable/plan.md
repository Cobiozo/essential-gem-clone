
# Plan: Globalna blokada prawego przycisku myszy

## Problem

Blokada prawego przycisku myszy jest obecnie stosowana tylko na wybranych stronach:
- `Index.tsx` (strona główna)
- `Page.tsx` (strony CMS)
- `KnowledgeCenter.tsx` (biblioteka)
- `NotFound.tsx` (404)
- `Admin.tsx` (panel admina)

Pozostałe strony (Dashboard, Training, Webinars, Messages, MyAccount itd.) nie mają tej blokady.

## Rozwiązanie

Dodanie `useSecurityPreventions()` do głównego komponentu `AppContent` w `App.tsx` - to zapewni globalną blokadę na **całej platformie**, niezależnie od strony.

---

## Zmiany techniczne

### Plik `src/App.tsx`

**1. Dodanie importu (linia ~21):**
```tsx
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
```

**2. Użycie hooka w AppContent (linia ~156-160):**
```tsx
const AppContent = () => {
  useDynamicMetaTags();
  const { toast } = useToast();
  
  // NOWE: Globalna blokada prawego przycisku na całej platformie
  useSecurityPreventions(false); // false = pozwala na zaznaczanie tekstu (potrzebne w formularzach)
  
  const { loginTrigger, profile, user, rolesReady, ... } = useAuth();
```

### Czyszczenie - usunięcie duplikatów (opcjonalne)

Po globalnym zastosowaniu można usunąć lokalne wywołania z:
- `Index.tsx`
- `Page.tsx`
- `KnowledgeCenter.tsx`
- `NotFound.tsx`

Jednak zostawienie ich nie szkodzi - hook jest idempotentny.

---

## Podsumowanie

| Plik | Zmiana |
|------|--------|
| `App.tsx` | Import + `useSecurityPreventions(false)` w AppContent |

## Oczekiwany rezultat

- Prawy przycisk myszy zablokowany na **każdej stronie** platformy
- Skróty klawiszowe (F12, Ctrl+U, Ctrl+S, Ctrl+P) zablokowane globalnie
- Zaznaczanie tekstu nadal możliwe (parametr `false`) - konieczne dla formularzy
- Przeciąganie elementów zablokowane
